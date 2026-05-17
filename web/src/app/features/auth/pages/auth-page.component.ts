import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApiService, type AuthResponse } from '../../../core/services/auth-api.service';
import { AuthRedirectService, type AuthIntent } from '../../../core/services/auth-redirect.service';
import { ConfigService } from '../../../core/services/config.service';
import { GoogleIdentityService } from '../../../core/services/google-identity.service';
import { RecaptchaV3Service } from '../../../core/services/recaptcha-v3.service';
import { SessionService } from '../../../core/services/session.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';
import { safeReturnUrl } from '../../../core/utils/safe-return-url';

type AuthPageData = {
  title: string;
  subtitle: string;
  submitLabel: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  intent?: AuthIntent;
};

@Component({
  standalone: true,
  selector: 'app-auth-page',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.scss',
})
export class AuthPageComponent implements OnInit, OnDestroy {
  @ViewChild('googleBtnHost') googleBtnHost?: ElementRef<HTMLDivElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly authApi = inject(AuthApiService);
  private readonly authRedirect = inject(AuthRedirectService);
  private readonly config = inject(ConfigService);
  private readonly recaptchaV3 = inject(RecaptchaV3Service);
  private readonly googleIdentity = inject(GoogleIdentityService);
  private googleButtonMounted = false;

  readonly data = this.route.snapshot.data as AuthPageData;
  readonly errorMessage = signal<string | null>(null);
  readonly loading = signal(false);
  readonly passwordVisible = signal(false);
  readonly showRecaptchaTerms = signal(false);
  readonly hasGoogle = signal(false);
  readonly googleLoading = signal(false);

  email = '';
  password = '';

  get showPassword(): boolean {
    return !this.isForgotPassword;
  }

  get isRegister(): boolean {
    return this.route.snapshot.routeConfig?.path?.includes('register') ?? false;
  }

  get isForgotPassword(): boolean {
    return this.route.snapshot.routeConfig?.path?.includes('forgot-password') ?? false;
  }

  get showGoogleSignIn(): boolean {
    return !this.isForgotPassword && this.hasGoogle();
  }

  get intent(): AuthIntent {
    const fromQuery = this.route.snapshot.queryParamMap.get('intent');
    if (fromQuery === 'customer' || fromQuery === 'workspace') return fromQuery;
    return this.data.intent ?? 'workspace';
  }

  get intentQueryParams(): { intent: AuthIntent } | null {
    return this.intent === 'customer' ? { intent: 'customer' } : null;
  }

  async ngOnInit(): Promise<void> {
    try {
      await firstValueFrom(this.config.loadPublicConfig());
    } catch {
      /* API caída: login sigue si el back no exige reCAPTCHA */
    }
    const siteKey = this.config.getRecaptchaSiteKey();
    if (siteKey) {
      this.showRecaptchaTerms.set(true);
      try {
        await this.recaptchaV3.prepare(siteKey);
      } catch {
        /* se reintenta en submit */
      }
    }
    this.hasGoogle.set(!!this.config.getGoogleOAuthClientId()?.trim());
    this.scheduleGoogleButtonInit();
  }

  ngOnDestroy(): void {
    this.googleIdentity.cancel();
  }

  togglePasswordVisible(): void {
    this.passwordVisible.update((v) => !v);
  }

  async submit(): Promise<void> {
    this.errorMessage.set(null);

    if (this.isForgotPassword) {
      await this.router.navigateByUrl('/auth/login');
      return;
    }

    const emailTrim = this.email.trim();
    if (!emailTrim) {
      this.errorMessage.set('Ingresá un email válido.');
      return;
    }
    if (this.showPassword && this.password.length < 8 && this.isRegister) {
      this.errorMessage.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (this.showPassword && !this.password) {
      this.errorMessage.set('Ingresá tu contraseña.');
      return;
    }

    this.loading.set(true);
    try {
      const recaptchaToken = await this.resolveRecaptchaToken();
      if (recaptchaToken === false) return;

      if (this.isRegister) {
        const res = await firstValueFrom(
          this.authApi.register({ email: emailTrim, password: this.password, recaptchaToken }),
        );
        await this.completeAuth(res, { fromRegister: true });
        return;
      }

      const res = await firstValueFrom(
        this.authApi.login({ email: emailTrim, password: this.password, recaptchaToken }),
      );
      await this.completeAuth(res, { fromRegister: false });
    } catch (err) {
      this.errorMessage.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  private async onGoogleCredential(idToken: string): Promise<void> {
    this.errorMessage.set(null);
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.authApi.loginWithGoogle({ idToken }));
      await this.completeAuth(res, { fromRegister: this.isRegister });
    } catch (err) {
      this.errorMessage.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  private async completeAuth(res: AuthResponse, opts: { fromRegister: boolean }): Promise<void> {
    this.session.signInWithTokens(res.accessToken, res.refreshToken, res.email);
    const target = await this.resolvePostAuthUrl(res, opts.fromRegister);
    await this.router.navigateByUrl(target);
  }

  private async resolvePostAuthUrl(res: AuthResponse, fromRegister: boolean): Promise<string> {
    return this.authRedirect.resolvePostAuthUrl({
      role: res.role,
      fromRegister,
      intent: this.intent,
      returnUrl: safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')),
    });
  }

  private async resolveRecaptchaToken(): Promise<string | undefined | false> {
    const siteKey = this.config.getRecaptchaSiteKey();
    if (!siteKey) return undefined;
    try {
      return await this.recaptchaV3.execute(siteKey, this.isRegister ? 'register' : 'login');
    } catch {
      this.errorMessage.set(
        'No se pudo completar la verificación de seguridad. Recargá la página e intentá de nuevo.',
      );
      return false;
    }
  }

  private scheduleGoogleButtonInit(): void {
    if (!this.showGoogleSignIn || this.googleButtonMounted) return;
    this.cdr.detectChanges();
    setTimeout(() => void this.initGoogleButton(), 0);
  }

  private async initGoogleButton(): Promise<void> {
    if (this.googleButtonMounted) return;
    const clientId = this.config.getGoogleOAuthClientId()?.trim();
    const host = this.googleBtnHost?.nativeElement;
    if (!clientId || !host) return;

    this.googleLoading.set(true);
    try {
      await this.googleIdentity.renderSignInButton(host, clientId, (credential) =>
        void this.onGoogleCredential(credential),
      );
      this.googleButtonMounted = true;
    } catch {
      this.errorMessage.set('No se pudo cargar el botón de Google. Recargá la página o usá email.');
    } finally {
      this.googleLoading.set(false);
    }
  }
}
