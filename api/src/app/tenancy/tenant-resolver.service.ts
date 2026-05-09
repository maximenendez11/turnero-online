import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { TenantContext } from './tenant-context.types';

@Injectable()
export class TenantResolverService {
  resolveFromRequest(request: Request): TenantContext | null {
    const fromHeader = request.headers['x-tenant-id'];
    const businessId = Array.isArray(fromHeader) ? fromHeader[0] : fromHeader;
    if (!businessId || typeof businessId !== 'string') {
      return null;
    }
    return { businessId };
  }
}
