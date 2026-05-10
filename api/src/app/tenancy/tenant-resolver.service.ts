import { Injectable } from '@nestjs/common';
import type { TenantContext, TenantRequestLike } from './tenant-context.types';

@Injectable()
export class TenantResolverService {
  resolveFromRequest(request: TenantRequestLike): TenantContext | null {
    const fromHeader = request.headers['x-tenant-id'];
    const businessId = Array.isArray(fromHeader) ? fromHeader[0] : fromHeader;
    if (!businessId || typeof businessId !== 'string') {
      return null;
    }
    return { businessId };
  }
}
