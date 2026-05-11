/** Enlace del menú lateral — administración: panel, turnos y negocio. */
export type WorkspaceNavLink = {
  label: string;
  path: string;
  /** `true` solo coincide con la ruta exacta (evita marcar varias secciones a la vez). */
  exact?: boolean;
};

export const WORKSPACE_NAV_LINKS: WorkspaceNavLink[] = [
  { label: 'Panel', path: '/app/dashboard', exact: true },
  { label: 'Turnos', path: '/app/appointments', exact: true },
  { label: 'Negocio', path: '/app/business', exact: true },
];
