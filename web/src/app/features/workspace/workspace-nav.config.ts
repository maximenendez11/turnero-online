/** Enlace del menú lateral — administración: panel, turnos, negocio, profesionales y clientes. */
export type WorkspaceNavLink = {
  label: string;
  path: string;
  /** Material Symbol name (p.ej. `dashboard`). */
  icon?: string;
  /** `true` solo coincide con la ruta exacta (evita marcar varias secciones a la vez). */
  exact?: boolean;
};

export const WORKSPACE_NAV_LINKS: WorkspaceNavLink[] = [
  { label: 'Panel', path: '/app/dashboard', icon: 'dashboard', exact: true },
  { label: 'Turnos', path: '/app/appointments', icon: 'event', exact: true },
  { label: 'Negocio', path: '/app/business', icon: 'store', exact: true },
  { label: 'Profesionales', path: '/app/staff', icon: 'badge', exact: true },
  { label: 'Clientes', path: '/app/customers', icon: 'group', exact: true },
];
