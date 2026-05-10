import type { IncomingHttpHeaders } from 'node:http';

export type TenantContext = {
  businessId: string;
};

/** Cabeceras HTTP suficientes para resolver tenant (sin depender de tipos de `express`). */
export type TenantRequestLike = {
  headers: IncomingHttpHeaders;
};

export const TENANT_CONTEXT_KEY = 'tenantContext';
