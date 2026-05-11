import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  HostListener,
  Input,
  OnDestroy,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { WORKSPACE_NAV_LINKS, type WorkspaceNavLink } from '../../workspace-nav.config';

/** `rail`: columna lateral (desktop). `topbar`: barra móvil con menú hamburguesa y cajón lateral. */
export type WorkspaceNavSidebarVariant = 'rail' | 'topbar';

@Component({
  standalone: true,
  selector: 'app-workspace-nav-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './workspace-nav-sidebar.component.html',
  styleUrl: './workspace-nav-sidebar.component.scss',
})
export class WorkspaceNavSidebarComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Referencias estables para RouterLinkActive.
   * Devolver `{ exact: ... }` nuevo en cada CD provoca re-evaluaciones en bucle.
   */
  protected readonly linkActiveExact = { exact: true };
  protected readonly linkActiveSubset = { exact: false };

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

  /** Solo variante `topbar`: cajón lateral abierto. */
  readonly menuOpen = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeMenu());
  }

  ngOnDestroy(): void {
    if (this.variant === 'topbar' && isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  get resolvedLinks(): WorkspaceNavLink[] {
    return this.links?.length ? this.links : WORKSPACE_NAV_LINKS;
  }

  trackByPath(_index: number, link: WorkspaceNavLink): string {
    return link.path;
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
    this.syncBodyScroll();
  }

  closeMenu(): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    this.syncBodyScroll();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.variant === 'topbar' && this.menuOpen()) {
      this.closeMenu();
    }
  }

  private syncBodyScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.body.style.overflow = this.menuOpen() ? 'hidden' : '';
  }
}
