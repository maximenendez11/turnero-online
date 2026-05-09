import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SessionService } from '../../../core/services/session.service';
import { OnboardingService } from '../../../core/services/onboarding.service';

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
  imports: [CommonModule, RouterLink],
  template: `
    <main class="auth-shell">
      <section class="auth-card">
        <h1>{{ data.title }}</h1>
        <p>{{ data.subtitle }}</p>
        <form (submit)="$event.preventDefault(); submit()">
          <label>
            <span>Email</span>
            <input type="email" placeholder="tu@email.com" />
          </label>
          <label *ngIf="showPassword">
            <span>Contrasena</span>
            <input type="password" placeholder="••••••••" />
          </label>
          <button type="submit">{{ data.submitLabel }}</button>
        </form>
        <a *ngIf="data.secondaryLabel && data.secondaryHref" [routerLink]="data.secondaryHref">
          {{ data.secondaryLabel }}
        </a>
      </section>
    </main>
  `,
  styles: [
    `
      .auth-shell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 1rem;
        background: #131313;
      }
      .auth-card {
        width: min(460px, 100%);
        background: rgba(30, 30, 30, 0.8);
        border: 1px solid #2d2d30;
        border-radius: 1rem;
        padding: 1.25rem;
      }
      h1 {
        margin: 0;
        color: #e5e2e1;
        font-size: 1.6rem;
      }
      p {
        margin: 0.5rem 0 1rem;
        color: #c2c6d6;
      }
      form {
        display: grid;
        gap: 0.85rem;
      }
      label {
        display: grid;
        gap: 0.35rem;
      }
      span {
        color: #c2c6d6;
        text-transform: uppercase;
        font-size: 0.72rem;
        letter-spacing: 0.04em;
      }
      input {
        background: #1c1b1b;
        border: 1px solid #424754;
        border-radius: 0.6rem;
        padding: 0.72rem 0.8rem;
        color: #e5e2e1;
        outline: none;
      }
      input:focus {
        border-color: #adc6ff;
      }
      button {
        margin-top: 0.35rem;
        border: 0;
        border-radius: 0.75rem;
        padding: 0.78rem;
        font-weight: 700;
        color: #002e6a;
        background: #adc6ff;
      }
      a {
        display: inline-block;
        margin-top: 0.95rem;
        color: #adc6ff;
        text-decoration: none;
      }
    `,
  ],
})
export class AuthPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly onboarding = inject(OnboardingService);
  readonly data = this.route.snapshot.data as AuthPageData;

  get showPassword(): boolean {
    return !this.route.snapshot.url.some((segment) => segment.path === 'forgot-password');
  }

  async submit(): Promise<void> {
    if (this.route.snapshot.routeConfig?.path?.includes('forgot-password')) {
      await this.router.navigateByUrl('/auth/login');
      return;
    }
    this.session.signIn();
    if (this.onboarding.isCompleted()) {
      await this.router.navigateByUrl('/app/dashboard');
      return;
    }
    await this.router.navigateByUrl('/onboarding/business-profile');
  }
}
