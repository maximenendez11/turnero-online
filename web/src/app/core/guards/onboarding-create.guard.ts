import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthRedirectService } from '../services/auth-redirect.service';

/** El asistente de alta solo aplica si el usuario aún no tiene negocio propio. */
export const onboardingCreateGuard: CanActivateFn = async () => {
  const authRedirect = inject(AuthRedirectService);
  const router = inject(Router);

  if (await authRedirect.userHasWorkspaceAccess()) {
    return router.parseUrl('/app/dashboard');
  }

  return true;
};
