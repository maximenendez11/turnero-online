import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, NavigationStart, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { AdminApiService, type AdminBusinessListItem } from '../../../core/services/admin-api.service';
import { AuthRedirectService } from '../../../core/services/auth-redirect.service';
import { OnboardingService } from '../../../core/services/onboarding.service';
import { WorkspaceNavSidebarComponent } from '../components/workspace-nav-sidebar/workspace-nav-sidebar.component';
import { CUSTOMER_NAV_LINKS } from '../customer-nav.config';
import { WORKSPACE_NAV_LINKS, type WorkspaceNavLink } from '../workspace-nav.config';
import {
  isCreateBusinessFlowUrl,
  resolveWorkspaceModeFromUrl,
  type WorkspaceMode,
} from '../workspace-mode.config';
import { WorkspaceThemeService } from '../services/workspace-theme.service';

const WORKSPACE_RAIL_COLLAPSED_KEY = 'workspace.nav.railCollapsed';

@Component({
  standalone: true,
  selector: 'app-workspace-layout',
  imports: [CommonModule, RouterLink, RouterOutlet, WorkspaceNavSidebarComponent],
  templateUrl: './workspace-layout.component.html',
  styleUrl: './workspace-layout.component.scss',
})
export class WorkspaceLayoutComponent {
  private readonly onboardingService = inject(OnboardingService);
  private readonly authRedirect = inject(AuthRedirectService);
  private readonly adminApi = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly workspaceTheme = inject(WorkspaceThemeService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly railCollapsed = signal(false);
  private readonly currentUrl = signal(this.router.url);
  readonly hasBusinessAccess = signal<boolean | null>(null);

  readonly activeWorkspaceMode = computed((): WorkspaceMode =>
    resolveWorkspaceModeFromUrl(this.currentUrl()),
  );

  readonly isCreateBusinessFlow = computed(() => isCreateBusinessFlowUrl(this.currentUrl()));

  readonly navLinks = computed((): WorkspaceNavLink[] => {
    if (this.isCreateBusinessFlow()) return [];
    return this.activeWorkspaceMode() === 'customer' ? CUSTOMER_NAV_LINKS : WORKSPACE_NAV_LINKS;
  });

  readonly navEyebrow = computed(() => {
    if (this.isCreateBusinessFlow()) return 'Nuevo negocio';
    return this.activeWorkspaceMode() === 'customer' ? 'Reservar turnos' : 'Mi negocio';
  });

  readonly workspaceNavTitle = computed(() => {
    if (this.isCreateBusinessFlow()) return 'Crear negocio';
    if (this.activeWorkspaceMode() === 'business') {
      return this.workspaceTheme.navBusinessName() ?? 'Tu negocio';
    }
    return 'Tu turno digital';
  });

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationStart => e instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe((e) => this.syncShellThemeForUrl(e.url));

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => this.currentUrl.set(e.urlAfterRedirects));

    this.syncShellThemeForUrl(this.router.url);

    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const raw = localStorage.getItem(WORKSPACE_RAIL_COLLAPSED_KEY);
      this.railCollapsed.set(raw === 'true');
    } catch {
      // ignore
    }
    void this.loadBusinessAccess();
  }

  private async loadBusinessAccess(): Promise<void> {
    try {
      const list = await firstValueFrom(this.adminApi.getBusinesses());
      this.hasBusinessAccess.set(list.length > 0);
      if (list.length === 0) return;
      this.warmBusinessShellFromList(list);
      void import('../pages/admin-dashboard-page.component');
    } catch {
      this.hasBusinessAccess.set(false);
    }
  }

  private warmBusinessShellFromList(list: AdminBusinessListItem[]): void {
    if (this.workspaceTheme.hasBusinessThemeCached()) return;
    const d = list[0];
    if (!d) return;
    const bg = (d.themeBackgroundHex ?? '').trim();
    const pr = (d.themePrimaryHex ?? '').trim();
    this.workspaceTheme.warmBusinessThemeCache(
      /^#[0-9A-Fa-f]{6}$/.test(bg) ? bg : null,
      /^#[0-9A-Fa-f]{6}$/.test(pr) ? pr : null,
      d.name,
    );
  }

  private syncShellThemeForUrl(url: string): void {
    this.workspaceTheme.syncForWorkspaceMode(
      resolveWorkspaceModeFromUrl(url),
      isCreateBusinessFlowUrl(url),
    );
  }

  onRailCollapsedChange(next: boolean): void {
    this.railCollapsed.set(next);
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(WORKSPACE_RAIL_COLLAPSED_KEY, String(next));
    } catch {
      // ignore
    }
  }

  get publicBookingPath(): string | null {
    if (this.isCreateBusinessFlow()) return null;
    return this.onboardingService.getPublicBookingPath();
  }
}
