import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';
import { safeReturnUrl } from '../utils/safe-return-url';

export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (session.isAuthenticated()) {
    return true;
  }
  const returnUrl = safeReturnUrl(state.url);
  if (returnUrl) {
    return router.parseUrl(`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  }
  return router.parseUrl('/auth/login');
};
