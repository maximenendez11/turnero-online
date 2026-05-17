import type { WorkspaceNavLink } from './workspace-nav.config';

/** Navegación principal del panel de cliente (modo reservar). */
export const CUSTOMER_NAV_LINKS: WorkspaceNavLink[] = [
  { label: 'Mis turnos', path: '/c/appointments', icon: 'event', exact: true },
  { label: 'Buscar comercio', path: '/c/search', icon: 'search', exact: true },
  { label: 'Mi perfil', path: '/c/profile', icon: 'person', exact: true },
];
