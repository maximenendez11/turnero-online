import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthRedirectService } from '../services/auth-redirect.service';
import { SessionService } from '../services/session.service';
import { safeReturnUrl } from '../utils/safe-return-url';

/** Evita mostrar login/registro si ya hay sesión activa. */
export const redirectIfAuthenticatedGuard: CanActivateFn = async (route) => {
  const session = inject(SessionService);
  const router = inject(Router);
  const authRedirect = inject(AuthRedirectService);

  if (!session.isAuthenticated()) {
    return true;
  }

  const returnUrl = safeReturnUrl(route.queryParamMap.get('returnUrl'));
  if (returnUrl) {
    return router.parseUrl(returnUrl);
  }

  const target = await authRedirect.resolveAuthenticatedHome(route.queryParamMap.get('intent'));
  return router.parseUrl(target);
};
