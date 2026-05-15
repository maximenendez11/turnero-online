import { CommonModule } from '@angular/common';
import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, firstValueFrom, of } from 'rxjs';
import {
  AdminApiService,
  type AdminBookingRow,
  type AdminBusinessDetail,
} from '../../../../core/services/admin-api.service';
import { apiErrorMessage } from '../../../../core/utils/api-error-message';
import {
  formatIsoToDatetimeLocalInZone,
  parseDatetimeLocalInZoneToIso,
  safeIanaTimeZone,
} from '../../pages/admin-bookings-calendar.utils';
import { isOpenNowInWindows } from '../../utils/opening-hours-now.utils';

@Component({
  standalone: true,
  selector: 'app-admin-booking-create-dialog',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-booking-create-dialog.component.html',
  styleUrl: './admin-booking-create-dialog.component.scss',
})
export class AdminBookingCreateDialogComponent implements OnInit {
  private readonly api = inject(AdminApiService);

  readonly businessId = input.required<string>();

  readonly cancel = output<void>();
  readonly created = output<AdminBookingRow>();

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  detail = signal<AdminBusinessDetail | null>(null);

  serviceId = '';
  startsAtLocal = '';
  customerFullName = '';
  customerContact = '';
  status: 'pending' | 'confirmed' | 'cancelled' = 'confirmed';

  readonly activeServices = signal<{ id: string; name: string; durationMin: number }[]>([]);

  ngOnInit(): void {
    void this.load();
  }

  timeZone(): string {
    const d = this.detail();
    return safeIanaTimeZone(d?.timezone);
  }

  businessName(): string {
    return this.detail()?.name ?? '';
  }

  /** Aviso si la fecha/hora no entra en la agenda de apertura (día cerrado u horario fuera de ventana). */
  outsideOpeningHoursWarning(): boolean {
    const d = this.detail();
    const wins = d?.openingWindows ?? [];
    if (!wins.length) return false;
    const tz = this.timeZone();
    const iso = parseDatetimeLocalInZoneToIso(this.startsAtLocal, tz);
    if (!iso) return false;
    const at = new Date(iso);
    if (Number.isNaN(at.getTime())) return false;
    return !isOpenNowInWindows(wins, tz, at);
  }

  onBackdropClick(): void {
    if (!this.saving()) this.cancel.emit();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const d = await firstValueFrom(this.api.getBusiness(this.businessId()).pipe(catchError(() => of(null))));
      if (!d) {
        this.error.set('No se pudo cargar el negocio.');
        this.detail.set(null);
        return;
      }
      this.detail.set(d);
      const svcs = d.services.filter((s) => s.isActive).map((s) => ({ id: s.id, name: s.name, durationMin: s.durationMin }));
      this.activeServices.set(svcs);
      if (svcs.length) {
        this.serviceId = svcs[0].id;
      }
      const tz = safeIanaTimeZone(d.timezone);
      this.startsAtLocal = formatIsoToDatetimeLocalInZone(new Date().toISOString(), tz);
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  async submit(): Promise<void> {
    const bid = this.businessId();
    const tz = this.timeZone();
    const iso = parseDatetimeLocalInZoneToIso(this.startsAtLocal, tz);
    if (!this.serviceId.trim()) {
      this.error.set('Elegí un servicio.');
      return;
    }
    if (!iso) {
      this.error.set('Revisá la fecha y hora de inicio.');
      return;
    }
    const name = this.customerFullName.trim();
    const contact = this.customerContact.trim();
    if (name.length < 2) {
      this.error.set('El nombre del cliente debe tener al menos 2 caracteres.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      const row = await firstValueFrom(
        this.api.createBooking(bid, {
          serviceId: this.serviceId,
          startsAt: iso,
          customerFullName: name,
          status: this.status,
          ...(contact ? { customerContact: contact } : {}),
        }),
      );
      this.created.emit(row);
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }
}
