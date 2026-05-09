import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TenantService } from '../services/tenant.service';

export const tenantGuard: CanActivateFn = (route) => {
  const tenantService = inject(TenantService);
  const router = inject(Router);
  const tenantSlug = route.paramMap.get('tenantSlug');
  return tenantService.isValidTenantSlug(tenantSlug) ? true : router.parseUrl('/');
};
