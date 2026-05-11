import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { OnboardingService } from '../../../core/services/onboarding.service';
import { WorkspaceNavSidebarComponent } from '../components/workspace-nav-sidebar/workspace-nav-sidebar.component';
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
  readonly workspaceTheme = inject(WorkspaceThemeService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly railCollapsed = signal(false);

  /** Título del sidebar: nombre del negocio cuando ya cargó el admin, si no el texto por defecto. */
  readonly workspaceNavTitle = computed(
    () => this.workspaceTheme.navBusinessName() ?? 'Tu turno digital',
  );

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const raw = localStorage.getItem(WORKSPACE_RAIL_COLLAPSED_KEY);
      this.railCollapsed.set(raw === 'true');
    } catch {
      // ignore
    }
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
    return this.onboardingService.getPublicBookingPath();
  }
}
