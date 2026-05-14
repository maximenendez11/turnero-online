import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OnboardingService } from '../services/onboarding.service';
import { SessionService } from '../services/session.service';

/** Evita mostrar login/registro si ya hay sesión activa. */
export const redirectIfAuthenticatedGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);
  const onboarding = inject(OnboardingService);

  if (!session.isAuthenticated()) {
    return true;
  }
  if (!onboarding.isCompleted()) {
    return router.parseUrl('/onboarding/business-profile');
  }
  return router.parseUrl('/app/dashboard');
};
