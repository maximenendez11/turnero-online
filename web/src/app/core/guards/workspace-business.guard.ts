import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthRedirectService } from '../services/auth-redirect.service';
import { SessionService } from '../services/session.service';

/** Panel de administración solo si el usuario tiene al menos un negocio (o es ADMIN). */
export const workspaceBusinessGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  const authRedirect = inject(AuthRedirectService);

  if (!session.isAuthenticated()) {
    return router.parseUrl('/auth/login');
  }

  if (await authRedirect.userHasWorkspaceAccess()) {
    return true;
  }

  return router.parseUrl('/c/appointments');
};
