import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DateTime } from 'luxon';
import { firstValueFrom } from 'rxjs';
import {
  AdminApiService,
  type AdminAgendaBlockConflict,
  type AgendaBlockOnConflict,
} from '../../../../core/services/admin-api.service';
import { apiErrorMessage } from '../../../../core/utils/api-error-message';
import {
  formatBookingDateCompactInZone,
  formatBookingTimeInZone,
  formatDayKeyInTimeZone,
  formatIsoToDatetimeLocalInZone,
  parseDatetimeLocalInZoneToIso,
  safeIanaTimeZone,
} from '../../pages/admin-bookings-calendar.utils';

function conflictPayload(
  err: unknown,
): { message: string; conflicts: AdminAgendaBlockConflict[] } | null {
  if (!(err instanceof HttpErrorResponse) || err.status !== 409) return null;
  const body = err.error;
  if (!body || typeof body !== 'object') return null;
  const conflicts = (body as { conflicts?: unknown }).conflicts;
  if (!Array.isArray(conflicts)) return null;
  const message = (body as { message?: unknown }).message;
  return {
    message: typeof message === 'string' ? message : 'Hay turnos en conflicto.',
    conflicts: conflicts as AdminAgendaBlockConflict[],
  };
}

@Component({
  standalone: true,
  selector: 'app-admin-agenda-block-dialog',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-agenda-block-dialog.component.html',
  styleUrl: './admin-agenda-block-dialog.component.scss',
})
export class AdminAgendaBlockDialogComponent implements OnInit {
  private readonly api = inject(AdminApiService);

  readonly businessId = input.required<string>();
  readonly timeZone = input.required<string>();
  readonly businessName = input('');

  readonly cancel = output<void>();
  readonly completed = output<void>();

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly conflicts = signal<AdminAgendaBlockConflict[]>([]);
  readonly successNotices = signal<{ bookingId: string; emailSent: boolean; whatsappUrl: string | null }[]>([]);
  readonly successDone = signal(false);

  reason = '';
  startsAtLocal = '';
  endsAtLocal = '';
  /** Inclusive last day (YYYY-MM-DD) in negocio TZ; same horas que el primer día. */
  repeatUntilDate = '';
  onConflict: AgendaBlockOnConflict = 'fail';

  ngOnInit(): void {
    const tz = safeIanaTimeZone(this.timeZone());
    const now = DateTime.now().setZone(tz);
    const start = now.plus({ minutes: 15 }).startOf('minute');
    const end = start.plus({ hours: 2 });
    this.startsAtLocal = formatIsoToDatetimeLocalInZone(start.toUTC().toISO()!, tz);
    this.endsAtLocal = formatIsoToDatetimeLocalInZone(end.toUTC().toISO()!, tz);
  }

  onBackdropClick(): void {
    if (!this.saving()) this.cancel.emit();
  }

  private buildIntervalPairs(): { startsAt: string; endsAt: string }[] | null {
    const tz = safeIanaTimeZone(this.timeZone());
    const s = parseDatetimeLocalInZoneToIso(this.startsAtLocal, tz);
    const e = parseDatetimeLocalInZoneToIso(this.endsAtLocal, tz);
    if (!s || !e || new Date(e) <= new Date(s)) return null;
    const until = this.repeatUntilDate.trim();
    if (!until) return [{ startsAt: s, endsAt: e }];

    const sDt = DateTime.fromISO(s, { zone: 'utc' }).setZone(tz);
    const eDt = DateTime.fromISO(e, { zone: 'utc' }).setZone(tz);
    const last = DateTime.fromISO(until, { zone: tz });
    if (!sDt.isValid || !eDt.isValid || !last.isValid) return null;
    const duration = eDt.diff(sDt);
    if (duration.as('milliseconds') <= 0) return null;
    const startKey = formatDayKeyInTimeZone(new Date(s), tz);
    let d = DateTime.fromISO(startKey, { zone: tz });
    if (!d.isValid) return null;
    const out: { startsAt: string; endsAt: string }[] = [];
    while (d <= last.endOf('day')) {
      const dayStart = d.set({
        hour: sDt.hour,
        minute: sDt.minute,
        second: 0,
        millisecond: 0,
      });
      const dayEnd = dayStart.plus(duration);
      out.push({ startsAt: dayStart.toUTC().toISO()!, endsAt: dayEnd.toUTC().toISO()! });
      d = d.plus({ days: 1 });
    }
    return out.length ? out : null;
  }

  onConflictModelChange(): void {
    if (this.conflicts().length > 0 && this.onConflict !== 'fail') {
      this.error.set(null);
    }
  }

  async runPreview(): Promise<void> {
    this.error.set(null);
    this.successDone.set(false);
    this.successNotices.set([]);
    const pairs = this.buildIntervalPairs();
    if (!pairs) {
      this.error.set('Revisá las fechas: la hora de fin debe ser posterior al inicio.');
      return;
    }
    const r = this.reason.trim();
    if (!r) {
      this.error.set('Escribí un motivo (ej.: emergencia, cita médica).');
      return;
    }
    this.saving.set(true);
    try {
      const merged: AdminAgendaBlockConflict[] = [];
      for (const p of pairs) {
        const res = await firstValueFrom(
          this.api.createAgendaBlock(this.businessId(), {
            ...p,
            reason: r,
            dryRun: true,
          }),
        );
        if (res.dryRun !== true) continue;
        for (const c of res.conflicts) {
          if (!merged.some((x) => x.id === c.id)) merged.push(c);
        }
      }
      this.conflicts.set(merged);
      if (merged.length === 0) {
        this.error.set(null);
      } else if (this.onConflict === 'fail') {
        this.error.set(
          'Hay turnos en esa franja. Elegí abajo si cancelarlos sin avisar, intentar avisar (mail / WhatsApp) o dejar «No hacer nada» y ajustar fechas.',
        );
      }
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }

  async confirmBlock(): Promise<void> {
    this.error.set(null);
    const pairs = this.buildIntervalPairs();
    if (!pairs) {
      this.error.set('Revisá las fechas: la hora de fin debe ser posterior al inicio.');
      return;
    }
    const r = this.reason.trim();
    if (!r) {
      this.error.set('Escribí un motivo (ej.: emergencia, cita médica).');
      return;
    }
    const hasC = this.conflicts().length > 0;
    if (hasC && this.onConflict === 'fail') {
      this.error.set('Hay turnos superpuestos: revisá la vista previa o elegí cómo resolverlos.');
      return;
    }
    this.saving.set(true);
    const allNotices: { bookingId: string; emailSent: boolean; whatsappUrl: string | null }[] = [];
    try {
      for (const p of pairs) {
        const res = await firstValueFrom(
          this.api.createAgendaBlock(this.businessId(), {
            ...p,
            reason: r,
            dryRun: false,
            onConflict: hasC ? this.onConflict : 'fail',
          }),
        );
        if (res.dryRun === false && res.notices?.length) {
          allNotices.push(...res.notices);
        }
      }
      const dedup = new Map<string, { bookingId: string; emailSent: boolean; whatsappUrl: string | null }>();
      for (const n of allNotices) {
        const cur = dedup.get(n.bookingId);
        if (!cur) dedup.set(n.bookingId, { ...n });
        else {
          dedup.set(n.bookingId, {
            bookingId: n.bookingId,
            emailSent: cur.emailSent || n.emailSent,
            whatsappUrl: cur.whatsappUrl ?? n.whatsappUrl,
          });
        }
      }
      this.successNotices.set([...dedup.values()]);
      this.successDone.set(true);
    } catch (err) {
      const cp = conflictPayload(err);
      if (cp) {
        this.error.set(cp.message);
        this.conflicts.set(cp.conflicts);
      } else {
        this.error.set(apiErrorMessage(err));
      }
    } finally {
      this.saving.set(false);
    }
  }

  finish(): void {
    this.completed.emit();
  }

  conflictSchedule(c: AdminAgendaBlockConflict): string {
    const tz = safeIanaTimeZone(this.timeZone());
    return `${formatBookingDateCompactInZone(c.startsAt, tz)} · ${formatBookingTimeInZone(c.startsAt, tz)} · ${c.service.name}`;
  }
}
