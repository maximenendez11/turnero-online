import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ONBOARDING_CREATE_BASE } from '../../features/onboarding/onboarding.routes';
import { AdminApiService } from './admin-api.service';

export type AuthIntent = 'workspace' | 'customer';
import { OnboardingService } from './onboarding.service';

@Injectable({ providedIn: 'root' })
export class AuthRedirectService {
  private readonly adminApi = inject(AdminApiService);
  private readonly onboarding = inject(OnboardingService);

  async userHasWorkspaceAccess(): Promise<boolean> {
    try {
      const businesses = await firstValueFrom(this.adminApi.getBusinesses());
      return businesses.length > 0;
    } catch {
      return false;
    }
  }

  async resolvePostAuthUrl(opts: {
    role: 'ADMIN' | 'USER';
    fromRegister: boolean;
    intent: AuthIntent;
    returnUrl: string | null;
  }): Promise<string> {
    if (opts.returnUrl) return opts.returnUrl;

    if (opts.fromRegister && opts.intent === 'workspace') {
      this.onboarding.reset();
      return `${ONBOARDING_CREATE_BASE}/profile`;
    }

    if (opts.role === 'ADMIN') {
      this.onboarding.markCompleted();
      return '/app/dashboard';
    }

    const hasBusiness = await this.userHasWorkspaceAccess();
    if (hasBusiness) {
      this.onboarding.markCompleted();
      return '/app/dashboard';
    }

    if (opts.intent === 'customer') {
      return '/c/appointments';
    }

    this.onboarding.clearCompletedFlag();
    return '/c/appointments';
  }

  async resolveAuthenticatedHome(_intent?: string | null): Promise<string> {
    const hasBusiness = await this.userHasWorkspaceAccess();
    if (hasBusiness) {
      this.onboarding.markCompleted();
      return '/app/dashboard';
    }

    return '/c/appointments';
  }
}
