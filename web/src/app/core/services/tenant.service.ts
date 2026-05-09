import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TenantService {
  isValidTenantSlug(slug: string | null): boolean {
    if (!slug) {
      return false;
    }
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  }
}
