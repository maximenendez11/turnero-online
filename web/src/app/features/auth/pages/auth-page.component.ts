import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { OnboardingService } from '../../../core/services/onboarding.service';
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
export class AuthPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly onboarding = inject(OnboardingService);
  private readonly authApi = inject(AuthApiService);

  readonly data = this.route.snapshot.data as AuthPageData;
  readonly errorMessage = signal<string | null>(null);
  readonly loading = signal(false);

  email = '';
  password = '';

  get showPassword(): boolean {
    return !this.route.snapshot.url.some((segment) => segment.path === 'forgot-password');
  }

  get isRegister(): boolean {
    return this.route.snapshot.routeConfig?.path?.includes('register') ?? false;
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
      if (path.includes('register')) {
        const res = await firstValueFrom(
          this.authApi.register({ email: emailTrim, password: this.password }),
        );
        this.session.signInWithToken(res.accessToken, res.email);
        this.onboarding.reset();
        await this.router.navigateByUrl('/onboarding/business-profile');
        return;
      }

      const res = await firstValueFrom(this.authApi.login({ email: emailTrim, password: this.password }));
      this.session.signInWithToken(res.accessToken, res.email);
      if (this.onboarding.isCompleted()) {
        await this.router.navigateByUrl('/app/dashboard');
        return;
      }
      await this.router.navigateByUrl('/onboarding/business-profile');
    } catch (err) {
      this.errorMessage.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}
