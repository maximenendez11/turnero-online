import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { OnboardingService } from '../../../core/services/onboarding.service';
import { WorkspaceNavSidebarComponent } from '../components/workspace-nav-sidebar/workspace-nav-sidebar.component';

@Component({
  standalone: true,
  selector: 'app-workspace-layout',
  imports: [CommonModule, RouterLink, RouterOutlet, WorkspaceNavSidebarComponent],
  templateUrl: './workspace-layout.component.html',
  styleUrl: './workspace-layout.component.scss',
})
export class WorkspaceLayoutComponent {
  private readonly onboardingService = inject(OnboardingService);

  get publicBookingPath(): string | null {
    return this.onboardingService.getPublicBookingPath();
  }
}
