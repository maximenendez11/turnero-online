/** Enlace del menú lateral — administración: turnos y negocio. */
export type WorkspaceNavLink = {
  label: string;
  path: string;
  /** `true` evita que `/app/appointments` marque activas otras rutas bajo `/app/`. */
  exact?: boolean;
};

export const WORKSPACE_NAV_LINKS: WorkspaceNavLink[] = [
  { label: 'Turnos', path: '/app/appointments', exact: true },
  { label: 'Negocio', path: '/app/business', exact: true },
];
