import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { WORKSPACE_NAV_LINKS, type WorkspaceNavLink } from '../../workspace-nav.config';

export type WorkspaceNavSidebarVariant = 'rail' | 'compact';

@Component({
  standalone: true,
  selector: 'app-workspace-nav-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './workspace-nav-sidebar.component.html',
  styleUrl: './workspace-nav-sidebar.component.scss',
})
export class WorkspaceNavSidebarComponent {
  /**
   * Referencias estables para RouterLinkActive.
   * Devolver `{ exact: ... }` nuevo en cada CD provoca re-evaluaciones en bucle.
   */
  protected readonly linkActiveExact = { exact: true };
  protected readonly linkActiveSubset = { exact: false };

  /** Rail fijo (desktop) o rejilla compacta (móvil). */
  @Input() variant: WorkspaceNavSidebarVariant = 'rail';

  /** Marca de sección / producto. */
  @Input() title = 'Tu turno digital';

  /** Texto corto sobre el título (estilo label-caps del design system). */
  @Input() eyebrow = 'Panel';

  /**
   * Enlaces del menú. Si no se pasa, se usan los del workspace por defecto
   * (reutilizable en otros layouts pasando otro array).
   */
  @Input() links: WorkspaceNavLink[] | null = null;

  get resolvedLinks(): WorkspaceNavLink[] {
    return this.links?.length ? this.links : WORKSPACE_NAV_LINKS;
  }

  trackByPath(_index: number, link: WorkspaceNavLink): string {
    return link.path;
  }
}
