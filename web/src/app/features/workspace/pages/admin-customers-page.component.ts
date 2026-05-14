import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, firstValueFrom, of } from 'rxjs';
import {
  AdminApiService,
  type AdminBusinessListItem,
  type AdminCustomerRow,
} from '../../../core/services/admin-api.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';
import { AdminPageSkeletonComponent } from '../components/admin-page-skeleton/admin-page-skeleton.component';
import { WorkspaceThemeService } from '../services/workspace-theme.service';
import { safeIanaTimeZone } from './admin-bookings-calendar.utils';
import {
  buildWhatsappOutreachBody,
  digitsOnly,
  isLikelyEmail,
  mailtoHref,
  whatsappDigitsValid,
  whatsappHref,
} from '../utils/admin-customers-contact.utils';

@Component({
  standalone: true,
  selector: 'app-admin-customers-page',
  imports: [CommonModule, FormsModule, AdminPageSkeletonComponent],
  templateUrl: './admin-customers-page.component.html',
  styleUrl: './admin-customers-page.component.scss',
})
export class AdminCustomersPageComponent {
  private readonly api = inject(AdminApiService);
  private readonly workspaceTheme = inject(WorkspaceThemeService);

  readonly businesses = signal<AdminBusinessListItem[]>([]);
  readonly customers = signal<AdminCustomerRow[]>([]);
  readonly filterBusinessId = signal('');
  readonly searchQuery = signal('');
  readonly loading = signal(true);
  readonly listBusy = signal(false);
  readonly error = signal<string | null>(null);

  readonly businessTimeZone = computed(() => {
    const id = this.filterBusinessId().trim();
    const raw = this.businesses().find((b) => b.id === id)?.timezone;
    return safeIanaTimeZone(raw);
  });

  readonly needsBusinessPick = computed(
    () => this.businesses().length > 1 && !this.filterBusinessId().trim(),
  );

  readonly filteredCustomers = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const rows = this.customers();
    if (!q) return rows;
    return rows.filter((r) => {
      const blob = `${r.customerFullName}\n${r.customerContact}`.toLowerCase();
      return blob.includes(q);
    });
  });

  constructor() {
    void this.init();
  }

  formatLastAttended(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('es-AR', {
      timeZone: this.businessTimeZone(),
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatMoney(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  mailtoFor(c: AdminCustomerRow): string | null {
    return mailtoHref(c.customerContact, c.customerFullName);
  }

  whatsappFor(c: AdminCustomerRow): string | null {
    const visitLabel = c.lastAttendedAt ? this.formatLastAttended(c.lastAttendedAt) : null;
    const body = buildWhatsappOutreachBody(c.customerFullName, visitLabel, c.lastServiceName);
    return whatsappHref(c.customerContact, body);
  }

  /** WhatsApp deshabilitado: solo email, o teléfono todavía incompleto. */
  showWhatsAppDisabled(c: AdminCustomerRow): boolean {
    const ct = c.customerContact.trim();
    if (!ct) return false;
    if (whatsappDigitsValid(ct)) return false;
    if (isLikelyEmail(ct)) return true;
    const d = digitsOnly(ct);
    return d.length > 0 && d.length < 8;
  }

  whatsappDisabledTitle(c: AdminCustomerRow): string {
    const ct = c.customerContact?.trim() ?? '';
    if (isLikelyEmail(ct)) {
      return 'Cuando el turno traiga un teléfono, vas a poder abrir WhatsApp desde acá.';
    }
    return 'El número no alcanza para WhatsApp. Revisá el contacto en la reserva.';
  }

  async retry(): Promise<void> {
    await this.reloadCustomers();
  }

  async onFilterBusinessChange(id: string): Promise<void> {
    this.filterBusinessId.set(id);
    await this.reloadCustomers();
    this.syncWorkspaceShellTheme();
  }

  private async init(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const list = await firstValueFrom(this.api.getBusinesses().pipe(catchError(() => of([]))));
      this.businesses.set(list);
      if (list.length === 1) {
        this.filterBusinessId.set(list[0].id);
      }
      await this.reloadCustomers();
      this.syncWorkspaceShellTheme();
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  private async reloadCustomers(): Promise<void> {
    const bid = this.filterBusinessId().trim();
    if (!bid) {
      this.customers.set([]);
      this.error.set(null);
      return;
    }
    this.listBusy.set(true);
    this.error.set(null);
    try {
      const rows = await firstValueFrom(this.api.getCustomers(bid));
      this.customers.set(Array.isArray(rows) ? rows : []);
    } catch (e) {
      this.error.set(apiErrorMessage(e));
      this.customers.set([]);
    } finally {
      this.listBusy.set(false);
    }
  }

  private syncWorkspaceShellTheme(): void {
    const id = this.filterBusinessId().trim();
    if (!id) {
      this.workspaceTheme.resetToDefault();
      return;
    }
    const d = this.businesses().find((b) => b.id === id);
    if (!d) {
      this.workspaceTheme.resetToDefault();
      return;
    }
    const bg = (d.themeBackgroundHex ?? '').trim();
    const pr = (d.themePrimaryHex ?? '').trim();
    this.workspaceTheme.applyBusinessTheme(
      /^#[0-9A-Fa-f]{6}$/.test(bg) ? bg : null,
      /^#[0-9A-Fa-f]{6}$/.test(pr) ? pr : null,
    );
    this.workspaceTheme.setNavBusinessName(d.name);
  }
}
