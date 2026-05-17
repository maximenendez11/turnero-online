import { ONBOARDING_CREATE_BASE } from '../onboarding/onboarding.routes';

/** Modo principal de la app autenticada: reservar turnos vs administrar negocio. */
export type WorkspaceMode = 'customer' | 'business';

export const WORKSPACE_MODE_CUSTOMER_HOME = '/c/appointments';
export const WORKSPACE_MODE_BUSINESS_HOME = '/app/dashboard';
export const WORKSPACE_MODE_CREATE_BUSINESS = `${ONBOARDING_CREATE_BASE}/profile`;

export function resolveWorkspaceModeFromUrl(url: string): WorkspaceMode {
  const path = normalizeWorkspacePath(url);
  if (path === '/app' || path.startsWith('/app/')) return 'business';
  if (path.startsWith(ONBOARDING_CREATE_BASE)) return 'business';
  return 'customer';
}

export function isCreateBusinessFlowUrl(url: string): boolean {
  const path = normalizeWorkspacePath(url);
  return path === ONBOARDING_CREATE_BASE || path.startsWith(`${ONBOARDING_CREATE_BASE}/`);
}

function normalizeWorkspacePath(url: string): string {
  return (url.split('?')[0] ?? '/').replace(/\/+$/, '') || '/';
}
