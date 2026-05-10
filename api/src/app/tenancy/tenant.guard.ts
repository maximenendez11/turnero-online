import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { TENANT_CONTEXT_KEY, type TenantRequestLike } from './tenant-context.types';
import { TenantResolverService } from './tenant-resolver.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly tenantResolver: TenantResolverService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TenantRequestLike & Record<string, unknown>>();
    const tenant = this.tenantResolver.resolveFromRequest(request);
    if (!tenant) {
      throw new UnauthorizedException('Missing x-tenant-id header');
    }
    request[TENANT_CONTEXT_KEY] = tenant;
    return true;
  }
}
