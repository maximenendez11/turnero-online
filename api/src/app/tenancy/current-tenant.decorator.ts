import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TENANT_CONTEXT_KEY, type TenantContext } from './tenant-context.types';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest<Record<string, unknown>>();
    const tenant = request[TENANT_CONTEXT_KEY] as TenantContext | undefined;
    if (!tenant) {
      throw new UnauthorizedException('Tenant context missing');
    }
    return tenant;
  },
);
