import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';
import { BookingFlowService } from '../services/booking-flow.service';
import { PublicBookingApiService, PublicService } from '../services/public-booking-api.service';
import { hydrateBookingShellSnapshot, persistBookingShellSnapshot } from '../utils/booking-theme-shell.cache';
import { buildBookingShellCssVars } from '../utils/booking-theme.utils';
import { formatListPrice as formatPriceArs, formatServiceListPrice } from '../utils/price-display.utils';
import { AppSplashService } from '../../../core/services/app-splash.service';
import { ConfigService, type PublicConfig } from '../../../core/services/config.service';
import { SessionService } from '../../../core/services/session.service';
import { BookingConfirmContactComponent } from '../components/booking-confirm-contact.component';

type ConfirmedBooking = {
  code: string;
  startsAt: string;
  status: string;
  customerFullName?: string;
  customerContact?: string;
  service?: { name: string; durationMin: number };
};

@Component({
  standalone: true,
  selector: 'app-booking-page',
  imports: [CommonModule, FormsModule, RouterLink, BookingConfirmContactComponent],
  templateUrl: './booking-page.component.html',
  styleUrl: './booking-page.component.scss',
})
export class BookingPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(PublicBookingApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly splash = inject(AppSplashService);
  private readonly publicConfig = inject(ConfigService);
  private readonly session = inject(SessionService);
  readonly flow = inject(BookingFlowService);

  readonly tenantSlug = this.route.snapshot.paramMap.get('tenantSlug') ?? 'peluqueria-demo';
  readonly bookingCode = this.route.snapshot.paramMap.get('bookingCode') ?? '';
  businessName = '';
  /** IANA tz from API; used to show confirmed bookings aligned to the business calendar. */
  businessTimezone: string | null = null;
  /** Tema desde API (#RRGGBB); null = usar valores por defecto del cliente. */
  themeBackgroundHex: string | null = null;
  themePrimaryHex: string | null = null;
  /** Tema/nombre restaurados desde caché antes del primer paint (evita parpadeo entre pasos). */
  private shellHydratedFromCache = false;
  step = 1;
  stepTitle = 'Elegir servicio';
  stepSubtitle = 'Selecciona el servicio que quieres reservar.';
  services: PublicService[] = [];
  days: string[] = [];
  selectedDay = '';
  slots: string[] = [];
  slotsLoading = false;
  /** Última respuesta de disponibilidad para `selectedDay` (para aviso fuera de agenda). */
  private lastFetchedDay = '';
  private lastFetchedSlots: string[] = [];
  /** Si la última llamada a disponibilidad falló, no inferimos “fuera de agenda”. */
  lastSlotsFetchSucceeded = false;
  servicesLoading = false;
  /** Propuesta de horario fuera de los chips (reloj del dispositivo). */
  customStartsAtLocal = '';
  /** Error al interpretar la fecha/hora propuesta (paso 2). */
  slotProposalError = '';

  readonly stepperLabels = ['Servicio', 'Fecha', 'Datos', 'Listo'] as const;
  customerFullName = '';
  googleOAuthClientId: string | null = null;
  bookingContactToken = '';
  verifiedContactEmail = '';
  sessionContactLoading = false;
  sessionContactFailed = false;
  reserveSubmitting = false;
  reserveError = '';
  confirmedBooking: ConfirmedBooking | null = null;
  successBookingLoading = false;

  constructor() {
    const snap = hydrateBookingShellSnapshot(this.tenantSlug, this.flow);
    if (snap) {
      this.shellHydratedFromCache = true;
      this.themeBackgroundHex = snap.themeBackgroundHex;
      this.themePrimaryHex = snap.themePrimaryHex;
      this.businessName = snap.businessName;
    }
    const dataStep = this.route.snapshot.data['step'];
    if (typeof dataStep === 'number' && dataStep >= 1) {
      this.step = dataStep;
    } else {
      const path = this.route.snapshot.routeConfig?.path ?? '';
      if (path.includes('/date-time')) this.step = 2;
      if (path.includes('/confirm')) this.step = 3;
      if (path.includes('/success')) this.step = 4;
    }
    this.init();
  }

  private async init(): Promise<void> {
    const businessLoad = firstValueFrom(
      this.api.getBusiness(this.tenantSlug).pipe(
        timeout(8000),
        catchError(() => of(null)),
      ),
    ).then((business) => {
      if (business && typeof business === 'object' && 'name' in business) {
        const b = business as {
          name: string;
          timezone?: string | null;
          themeBackgroundHex?: string | null;
          themePrimaryHex?: string | null;
        };
        this.businessName = String(b.name);
        this.businessTimezone =
          typeof b.timezone === 'string' && b.timezone.trim().length > 0 ? b.timezone.trim() : null;
        const bg = b.themeBackgroundHex?.trim();
        const pr = b.themePrimaryHex?.trim();
        this.themeBackgroundHex = bg && /^#[0-9A-Fa-f]{6}$/.test(bg) ? bg : null;
        this.themePrimaryHex = pr && /^#[0-9A-Fa-f]{6}$/.test(pr) ? pr : null;
        persistBookingShellSnapshot(this.tenantSlug, this.flow, {
          themeBackgroundHex: this.themeBackgroundHex,
          themePrimaryHex: this.themePrimaryHex,
          businessName: this.businessName,
        });
      } else {
        if (!this.businessName.trim()) {
          this.businessName = this.tenantSlug.replace(/-/g, ' ');
        }
        this.businessTimezone = null;
        if (!this.shellHydratedFromCache) {
          this.themeBackgroundHex = null;
          this.themePrimaryHex = null;
        }
      }
      this.cdr.markForCheck();
      // Evita flash de estilos "default" hasta tener el tema resuelto (API o caché).
      this.splash.hide();
    });

    if (this.step === 1) {
      this.stepTitle = 'Elegir servicio';
      this.stepSubtitle = 'Selecciona el servicio que quieres reservar.';
      await Promise.all([businessLoad, this.loadServicesWithRetry()]);
      if (this.services.length === 1) {
        this.flow.selectService(this.services[0]);
      }
    } else if (this.step === 2) {
      await businessLoad;
      this.stepTitle = 'Elegir fecha y hora';
      this.stepSubtitle = 'Escoge una franja con disponibilidad.';
      if (!this.flow.value.service) {
        await this.router.navigateByUrl(`/${this.tenantSlug}/book/service`);
        return;
      }
      this.days = this.generateNextDays();
      this.selectedDay = this.days[0];
      await this.loadSlots();
    } else if (this.step === 3) {
      await businessLoad;
      await this.loadPublicConfigForBooking();
      this.stepTitle = 'Confirmar reserva';
      this.stepSubtitle = 'Completa tus datos para confirmar.';
      if (!this.flow.value.service || !this.flow.value.startsAt) {
        await this.router.navigateByUrl(`/${this.tenantSlug}/book/service`);
      } else {
        this.ensureSelectedDayForSlot(this.flow.value.startsAt);
        this.days = this.generateNextDays();
        await this.loadSlots();
        await this.tryApplySessionContact();
      }
    } else if (this.step === 4) {
      await businessLoad;
      this.stepTitle = 'Reserva confirmada';
      this.stepSubtitle = 'Tu turno fue reservado correctamente.';
      if (this.bookingCode) {
        await this.loadConfirmedBooking();
      }
    }
  }

  pickService(service: PublicService): void {
    this.flow.selectService(service);
  }

  formatPriceDisplay(svc: PublicService): string {
    return formatServiceListPrice(svc);
  }

  async pickDay(day: string): Promise<void> {
    this.selectedDay = day;
    this.slotProposalError = '';
    await this.loadSlots();
    const current = this.flow.value.startsAt;
    if (current && !this.slots.some((s) => this.isSameInstant(s, current))) {
      this.flow.selectSlot(null);
    }
  }

  pickSlot(slot: string): void {
    this.customStartsAtLocal = '';
    this.slotProposalError = '';
    this.flow.selectSlot(slot);
  }

  /** Comparación por instante para el chip seleccionado (evita mismatch de string ISO). */
  isSameSlotSelection(slot: string): boolean {
    const at = this.flow.value.startsAt;
    return !!at && this.isSameInstant(slot, at);
  }

  /** El horario elegido no está entre los turnos publicados para ese día (cerrado, completo u horario manual). */
  hasOffScheduleWarning(): boolean {
    if (this.slotsLoading) return false;
    const at = this.flow.value.startsAt;
    if (!at || !this.lastSlotsFetchSucceeded) return false;
    if (this.lastFetchedDay !== this.selectedDay) return false;
    return !this.lastFetchedSlots.some((s) => this.isSameInstant(s, at));
  }

  applyCustomStartsAt(): void {
    this.slotProposalError = '';
    const v = this.customStartsAtLocal?.trim();
    if (!v) return;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      this.slotProposalError = 'Revisá la fecha y hora propuestas.';
      this.cdr.markForCheck();
      return;
    }
    const t = d.getTime();
    const snapped = this.slots.find((s) => new Date(s).getTime() === t);
    this.flow.selectSlot(snapped ?? d.toISOString());
    this.cdr.markForCheck();
  }

  stepAriaLabel(index: number, stepNumber: number): string {
    const label = this.stepperLabels[index];
    if (this.step > stepNumber) return `${label}, completado`;
    if (this.step === stepNumber) return `${label}, paso actual`;
    return `${label}, pendiente`;
  }

  canContinue(): boolean {
    if (this.step === 1) return !!this.flow.value.service;
    if (this.step === 2) return !!this.flow.value.startsAt;
    return false;
  }

  canReserve(): boolean {
    return (
      this.customerFullName.trim().length >= 2 &&
      this.bookingContactToken.trim().length >= 20 &&
      !!this.flow.value.startsAt
    );
  }

  onContactVerified(ev: { token: string; email: string } | null): void {
    this.bookingContactToken = ev?.token?.trim() ?? '';
    this.verifiedContactEmail = ev?.email?.trim() ?? '';
    this.reserveError = '';
    this.cdr.markForCheck();
  }

  get isAuthenticated(): boolean {
    return this.session.isAuthenticated();
  }

  confirmLoginReturnUrl(): string {
    return `/${this.tenantSlug}/book/confirm`;
  }

  private async tryApplySessionContact(): Promise<void> {
    if (!this.session.isAuthenticated()) return;
    this.sessionContactLoading = true;
    this.sessionContactFailed = false;
    this.cdr.markForCheck();
    try {
      const res = await firstValueFrom(this.api.verifySessionBookingContact(this.tenantSlug));
      this.onContactVerified({ token: res.bookingContactToken, email: res.email });
    } catch {
      this.sessionContactFailed = true;
    } finally {
      this.sessionContactLoading = false;
      this.cdr.markForCheck();
    }
  }

  async goNext(): Promise<void> {
    if (this.step === 1) await this.router.navigateByUrl(`/${this.tenantSlug}/book/date-time`);
    if (this.step === 2) await this.router.navigateByUrl(`/${this.tenantSlug}/book/confirm`);
  }

  async goPrev(): Promise<void> {
    if (this.step === 2) await this.router.navigateByUrl(`/${this.tenantSlug}/book/service`);
    if (this.step === 3) await this.router.navigateByUrl(`/${this.tenantSlug}/book/date-time`);
  }

  async reserve(): Promise<void> {
    if (!this.flow.value.service || !this.flow.value.startsAt || !this.bookingContactToken.trim()) return;
    this.reserveSubmitting = true;
    this.reserveError = '';
    this.cdr.markForCheck();
    try {
      const result = await firstValueFrom(
        this.api.createBooking(this.tenantSlug, {
          serviceId: this.flow.value.service.id,
          startsAt: this.flow.value.startsAt,
          customerFullName: this.customerFullName.trim(),
          bookingContactToken: this.bookingContactToken.trim(),
        }),
      );
      this.flow.reset();
      await this.router.navigateByUrl(`/${this.tenantSlug}/book/success/${result.code}`);
    } catch (e) {
      this.reserveError = this.formatReserveError(e);
    } finally {
      this.reserveSubmitting = false;
      this.cdr.markForCheck();
    }
  }

  private formatReserveError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: string | string[] } | null;
      const m = body?.message;
      if (Array.isArray(m)) return m.join('. ');
      if (typeof m === 'string' && m.trim()) return m;
    }
    return 'No se pudo confirmar la reserva. Reintentá o verificá de nuevo tu contacto.';
  }

  private async loadPublicConfigForBooking(): Promise<void> {
    await firstValueFrom(
      this.publicConfig.loadPublicConfig().pipe(
        catchError(() =>
          of({
            googleMapsApiKey: null,
            recaptchaSiteKey: null,
            googleOAuthClientId: null,
          } as PublicConfig),
        ),
      ),
    );
    this.googleOAuthClientId = this.publicConfig.getGoogleOAuthClientId();
    this.cdr.markForCheck();
  }

  private generateNextDays(): string[] {
    const days: string[] = [];
    const current = new Date();
    for (let i = 0; i < 7; i += 1) {
      const next = new Date(current);
      next.setDate(current.getDate() + i);
      days.push(this.toLocalDateKey(next));
    }
    return days;
  }

  /** YYYY-MM-DD in the user's local calendar (avoid UTC drift from toISOString). */
  private toLocalDateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * If the user lands on confirm with a slot but no selected day (e.g. restored flow),
   * pick the local calendar day that matches the slot start in the business timezone when set,
   * otherwise the browser's local calendar.
   */
  private ensureSelectedDayForSlot(startsAt: string): void {
    if (this.selectedDay) return;
    const key = this.dateKeyForInstant(startsAt);
    if (key) this.selectedDay = key;
  }

  private dateKeyForInstant(iso: string): string | null {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const tz = this.businessTimezone;
    if (tz) {
      try {
        const parts = new Intl.DateTimeFormat('en-CA', {
          timeZone: tz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).formatToParts(d);
        const y = parts.find((p) => p.type === 'year')?.value;
        const m = parts.find((p) => p.type === 'month')?.value;
        const day = parts.find((p) => p.type === 'day')?.value;
        if (y && m && day) return `${y}-${m}-${day}`;
      } catch {
        /* invalid tz */
      }
    }
    return this.toLocalDateKey(d);
  }

  /** Wall clock in the user's browser (matches how slot chips were chosen). */
  private timeFromSlotLocal(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  }

  private longDateFromDayKey(dayKey: string): string {
    const d = this.parseLocalDay(dayKey);
    return new Intl.DateTimeFormat('es', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(d);
  }

  dayParts(isoDate: string): { dow: string; dayNum: string; month: string } {
    const d = this.parseLocalDay(isoDate);
    const dow = new Intl.DateTimeFormat('es', { weekday: 'short' }).format(d).replace('.', '');
    const dayNum = new Intl.DateTimeFormat('es', { day: 'numeric' }).format(d);
    const month = new Intl.DateTimeFormat('es', { month: 'short' }).format(d).replace('.', '');
    return { dow: this.capitalize(dow), dayNum, month: this.capitalize(month) };
  }

  slotTimeLabel(slot: string): string {
    return this.timeFromSlotLocal(slot) || slot;
  }

  /**
   * Uses the calendar day the user chose (chip row), not the UTC instant's local date,
   * so the label matches "Martes 12" even when the ISO instant falls on the previous local day.
   */
  selectedSlotSummary(): string {
    const at = this.flow.value.startsAt;
    if (!at) return '';
    const dayKey = this.selectedDay || this.dateKeyForInstant(at);
    if (!dayKey) return '';
    const datePart = this.longDateFromDayKey(dayKey);
    const timePart = this.timeFromSlotLocal(at);
    return `${this.capitalize(datePart)} · ${timePart}`;
  }

  /** Sticky summary: servicio, precio y (si hay) fecha/hora. */
  summaryFooterLine(): string {
    const svc = this.flow.value.service;
    const name = svc?.name?.trim() ? svc.name : '-';
    const price = svc ? formatServiceListPrice(svc) : '—';
    const head = `${name} · ${price}`;
    const at = this.flow.value.startsAt;
    if (!at) return head;
    const sched = this.summaryScheduleShort();
    if (sched === '-') return head;
    return `${head} · ${sched}`;
  }

  /** Compact line for sticky summary (consistent with selected slot). */
  summaryScheduleShort(): string {
    const at = this.flow.value.startsAt;
    if (!at) return '-';
    const dayKey = this.selectedDay || this.dateKeyForInstant(at);
    if (!dayKey) return '-';
    const d = this.parseLocalDay(dayKey);
    const date = new Intl.DateTimeFormat('es', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
    return `${date} · ${this.timeFromSlotLocal(at)}`;
  }

  /** Confirm step: date from chosen day + wall time in business (or local) TZ. */
  confirmHorarioLine(): string {
    const at = this.flow.value.startsAt;
    if (!at) return '-';
    const dayKey = this.selectedDay || this.dateKeyForInstant(at);
    if (!dayKey) return '-';
    const d = this.parseLocalDay(dayKey);
    const date = new Intl.DateTimeFormat('es', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
    return `${date} ${this.timeFromSlotLocal(at)}`;
  }

  /** Success / API payload: full datetime in business TZ when available. */
  formatBookingInstant(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const opts: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    const tz = this.businessTimezone;
    if (tz) {
      try {
        const fmt = new Intl.DateTimeFormat('es', { ...opts, timeZone: tz });
        return this.capitalize(fmt.format(d));
      } catch {
        /* fall through */
      }
    }
    return this.capitalize(new Intl.DateTimeFormat('es', opts).format(d));
  }

  formatBookingInstantShort(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const opts: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    const tz = this.businessTimezone;
    if (tz) {
      try {
        return new Intl.DateTimeFormat('es', { ...opts, timeZone: tz }).format(d);
      } catch {
        /* fall through */
      }
    }
    return new Intl.DateTimeFormat('es', opts).format(d);
  }

  private parseLocalDay(isoDate: string): Date {
    const [y, m, d] = isoDate.split('-').map((x) => Number.parseInt(x, 10));
    return new Date(y, (m || 1) - 1, d || 1);
  }

  /** Variables CSS: fondo, primario, superficies, textos y stepper según tema del negocio. */
  bookingShellStyles(): Record<string, string> {
    return buildBookingShellCssVars(this.themeBackgroundHex, this.themePrimaryHex);
  }

  private capitalize(s: string): string {
    if (!s) return s;
    return s.charAt(0).toLocaleUpperCase('es') + s.slice(1);
  }

  private isSameInstant(isoA: string, isoB: string): boolean {
    const ta = new Date(isoA).getTime();
    const tb = new Date(isoB).getTime();
    return Number.isFinite(ta) && Number.isFinite(tb) && ta === tb;
  }

  private async loadSlots(): Promise<void> {
    if (!this.flow.value.service) return;
    this.slotsLoading = true;
    this.slots = [];
    this.cdr.markForCheck();
    try {
      const availability = await firstValueFrom(
        this.api.getAvailability(this.tenantSlug, this.flow.value.service.id, this.selectedDay),
      );
      this.slots = availability.slots;
      this.lastSlotsFetchSucceeded = true;
    } catch {
      this.slots = [];
      this.lastSlotsFetchSucceeded = false;
    } finally {
      this.slotsLoading = false;
      this.lastFetchedDay = this.selectedDay;
      this.lastFetchedSlots = [...this.slots];
      this.cdr.markForCheck();
    }
  }

  async reloadServices(): Promise<void> {
    await this.loadServicesWithRetry();
  }

  private async loadServicesWithRetry(): Promise<void> {
    this.servicesLoading = true;
    this.cdr.markForCheck();
    try {
      this.services = await firstValueFrom(
        this.api.getServices(this.tenantSlug).pipe(
          timeout(8000),
          catchError(() => of([] as PublicService[])),
        ),
      );
      this.cdr.markForCheck();
      if (this.services.length > 0) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      this.services = await firstValueFrom(
        this.api.getServices(this.tenantSlug).pipe(
          timeout(8000),
          catchError(() => of([] as PublicService[])),
        ),
      );
    } catch {
      this.services = [];
    } finally {
      this.servicesLoading = false;
      this.cdr.markForCheck();
    }
  }

  private async loadConfirmedBooking(): Promise<void> {
    if (!this.bookingCode) return;
    this.successBookingLoading = true;
    this.cdr.markForCheck();
    try {
      const raw = await firstValueFrom(
        this.api.getBooking(this.tenantSlug, this.bookingCode).pipe(
          timeout(8000),
          catchError(() => of(null)),
        ),
      );
      if (raw && typeof raw === 'object' && 'code' in raw) {
        this.confirmedBooking = raw as ConfirmedBooking;
      }
    } finally {
      this.successBookingLoading = false;
      this.cdr.markForCheck();
    }
  }
}
