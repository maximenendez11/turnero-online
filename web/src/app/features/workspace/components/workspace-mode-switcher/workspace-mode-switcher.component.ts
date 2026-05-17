import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { WorkspaceThemeService } from '../../services/workspace-theme.service';
import {
  WORKSPACE_MODE_BUSINESS_HOME,
  WORKSPACE_MODE_CREATE_BUSINESS,
  WORKSPACE_MODE_CUSTOMER_HOME,
  type WorkspaceMode,
} from '../../workspace-mode.config';

@Component({
  standalone: true,
  selector: 'app-workspace-mode-switcher',
  imports: [CommonModule],
  templateUrl: './workspace-mode-switcher.component.html',
  styleUrl: './workspace-mode-switcher.component.scss',
})
export class WorkspaceModeSwitcherComponent {
  private readonly router = inject(Router);
  private readonly workspaceTheme = inject(WorkspaceThemeService);

  @Input() activeMode: WorkspaceMode = 'customer';
  @Input() hasBusiness: boolean | null = null;
  @Input() compact = false;
  @Input() stacked = false;

  @Output() readonly modeNavigate = new EventEmitter<void>();

  readonly customerHome = WORKSPACE_MODE_CUSTOMER_HOME;
  readonly businessHome = WORKSPACE_MODE_BUSINESS_HOME;
  readonly createBusinessPath = WORKSPACE_MODE_CREATE_BUSINESS;

  businessTarget(): string {
    return this.hasBusiness ? this.businessHome : this.createBusinessPath;
  }

  businessLabel(): string {
    if (this.hasBusiness === false) return 'Publicar';
    return 'Negocio';
  }

  businessLabelLong(): string {
    if (this.hasBusiness === false) return 'Crear mi negocio';
    return 'Panel de mi negocio';
  }

  businessIcon(): string {
    return this.hasBusiness === false ? 'add_business' : 'store';
  }

  goCustomer(): void {
    if (this.activeMode === 'customer') return;
    this.workspaceTheme.applyAppShellTheme();
    this.modeNavigate.emit();
    void this.router.navigateByUrl(this.customerHome);
  }

  goBusiness(): void {
    if (this.activeMode === 'business') return;
    this.workspaceTheme.restoreBusinessTheme();
    this.modeNavigate.emit();
    void this.router.navigateByUrl(this.businessTarget());
  }
}
