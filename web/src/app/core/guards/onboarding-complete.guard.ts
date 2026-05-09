import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OnboardingService } from '../services/onboarding.service';

export const onboardingCompleteGuard: CanActivateFn = () => {
  const onboarding = inject(OnboardingService);
  const router = inject(Router);
  return onboarding.isCompleted() ? true : router.parseUrl('/onboarding/business-profile');
};
