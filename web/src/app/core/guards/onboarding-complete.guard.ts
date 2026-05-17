import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ONBOARDING_CREATE_BASE } from '../../features/onboarding/onboarding.routes';
import { OnboardingService } from '../services/onboarding.service';

export const onboardingCompleteGuard: CanActivateFn = () => {
  const onboarding = inject(OnboardingService);
  const router = inject(Router);
  return onboarding.isCompleted() ? true : router.parseUrl(`${ONBOARDING_CREATE_BASE}/profile`);
};
