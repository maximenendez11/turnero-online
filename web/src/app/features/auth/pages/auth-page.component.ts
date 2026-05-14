import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { ConfigService } from '../../../core/services/config.service';
import { OnboardingService } from '../../../core/services/onboarding.service';
import { RecaptchaV3Service } from '../../../core/services/recaptcha-v3.service';
import { SessionService } from '../../../core/services/session.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';

type AuthPageData = {
  title: string;
  subtitle: string;
  submitLabel: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

@Component({
  standalone: true,
  selector: 'app-auth-page',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.scss',
})
export class AuthPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly onboarding = inject(OnboardingService);
  private readonly authApi = inject(AuthApiService);
  private readonly adminApi = inject(AdminApiService);
  private readonly config = inject(ConfigService);
  private readonly recaptchaV3 = inject(RecaptchaV3Service);

  readonly data = this.route.snapshot.data as AuthPageData;
  readonly errorMessage = signal<string | null>(null);
  readonly loading = signal(false);
  readonly passwordVisible = signal(false);
  readonly showRecaptchaTerms = signal(false);

  email = '';
  password = '';

  get showPassword(): boolean {
    return !this.route.snapshot.url.some((segment) => segment.path === 'forgot-password');
  }

  get isRegister(): boolean {
    return this.route.snapshot.routeConfig?.path?.includes('register') ?? false;
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
  }

  togglePasswordVisible(): void {
    this.passwordVisible.update((v) => !v);
  }

  async submit(): Promise<void> {
    this.errorMessage.set(null);

    if (this.route.snapshot.routeConfig?.path?.includes('forgot-password')) {
      await this.router.navigateByUrl('/auth/login');
      return;
    }

    const path = this.route.snapshot.routeConfig?.path ?? '';
    const emailTrim = this.email.trim();
    if (!emailTrim) {
      this.errorMessage.set('Ingresá un email válido.');
      return;
    }
    if (this.showPassword && this.password.length < 8 && path.includes('register')) {
      this.errorMessage.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (this.showPassword && !this.password) {
      this.errorMessage.set('Ingresá tu contraseña.');
      return;
    }

    this.loading.set(true);
    try {
      let recaptchaToken: string | undefined;
      const siteKey = this.config.getRecaptchaSiteKey();
      if (siteKey) {
        try {
          recaptchaToken = await this.recaptchaV3.execute(
            siteKey,
            path.includes('register') ? 'register' : 'login',
          );
        } catch {
          this.errorMessage.set(
            'No se pudo completar la verificación de seguridad. Recargá la página e intentá de nuevo.',
          );
          return;
        }
      }

      if (path.includes('register')) {
        const res = await firstValueFrom(
          this.authApi.register({ email: emailTrim, password: this.password, recaptchaToken }),
        );
        this.session.signInWithTokens(res.accessToken, res.refreshToken, res.email);
        this.onboarding.reset();
        await this.router.navigateByUrl('/onboarding/business-profile');
        return;
      }

      const res = await firstValueFrom(
        this.authApi.login({ email: emailTrim, password: this.password, recaptchaToken }),
      );
      this.session.signInWithTokens(res.accessToken, res.refreshToken, res.email);
      if (res.role === 'ADMIN') {
        this.onboarding.markCompleted();
        await this.router.navigateByUrl('/app/dashboard');
        return;
      }
      try {
        const businesses = await firstValueFrom(this.adminApi.getBusinesses());
        if (businesses.length > 0) {
          this.onboarding.markCompleted();
          await this.router.navigateByUrl('/app/dashboard');
          return;
        }
      } catch {
        /* sin sync: mejor forzar onboarding que dejar bandera local obsoleta */
      }
      this.onboarding.clearCompletedFlag();
      await this.router.navigateByUrl('/onboarding/business-profile');
    } catch (err) {
      this.errorMessage.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}
