import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { TENANT_CONTEXT_KEY } from './tenant-context.types';
import { TenantResolverService } from './tenant-resolver.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly tenantResolver: TenantResolverService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & Record<string, unknown>>();
    const tenant = this.tenantResolver.resolveFromRequest(request);
    if (!tenant) {
      throw new UnauthorizedException('Missing x-tenant-id header');
    }
    request[TENANT_CONTEXT_KEY] = tenant;
    return true;
  }
}
