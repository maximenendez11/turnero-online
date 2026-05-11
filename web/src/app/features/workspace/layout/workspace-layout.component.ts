import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { OnboardingService } from '../../../core/services/onboarding.service';
import { WorkspaceNavSidebarComponent } from '../components/workspace-nav-sidebar/workspace-nav-sidebar.component';
import { WorkspaceThemeService } from '../services/workspace-theme.service';

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

  /** Título del sidebar: nombre del negocio cuando ya cargó el admin, si no el texto por defecto. */
  readonly workspaceNavTitle = computed(
    () => this.workspaceTheme.navBusinessName() ?? 'Tu turno digital',
  );

  get publicBookingPath(): string | null {
    return this.onboardingService.getPublicBookingPath();
  }
}
