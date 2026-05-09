import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';
import { rememberBooking } from '../../customer/recent-bookings.storage';
import { BookingFlowService } from '../services/booking-flow.service';
import { PublicBookingApiService, PublicService, PublicStaff } from '../services/public-booking-api.service';

type ConfirmedBooking = {
  code: string;
  startsAt: string;
  status: string;
  service?: { name: string; durationMin: number };
  staff?: { fullName: string };
};

@Component({
  standalone: true,
  selector: 'app-booking-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './booking-page.component.html',
  styleUrl: './booking-page.component.scss',
})
export class BookingPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(PublicBookingApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly flow = inject(BookingFlowService);

  readonly tenantSlug = this.route.snapshot.paramMap.get('tenantSlug') ?? 'peluqueria-demo';
  readonly bookingCode = this.route.snapshot.paramMap.get('bookingCode') ?? '';
  businessName = '';
  step = 1;
  stepTitle = 'Elegir servicio';
  stepSubtitle = 'Selecciona el servicio que quieres reservar.';
  services: PublicService[] = [];
  staff: PublicStaff[] = [];
  days: string[] = [];
  selectedDay = '';
  slots: string[] = [];
  servicesLoading = false;
  staffLoading = false;
  staffError = false;
  customerName = '';
  customerEmail = '';
  customerPhone = '';
  confirmedBooking: ConfirmedBooking | null = null;
  successBookingLoading = false;

  constructor() {
    const dataStep = this.route.snapshot.data['step'];
    if (typeof dataStep === 'number' && dataStep >= 1) {
      this.step = dataStep;
    } else {
      const path = this.route.snapshot.routeConfig?.path ?? '';
      if (path.includes('/staff')) this.step = 2;
      if (path.includes('/date-time')) this.step = 3;
      if (path.includes('/confirm')) this.step = 4;
      if (path.includes('/payment')) this.step = 5;
      if (path.includes('/success')) this.step = 5;
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
        this.businessName = String((business as { name: string }).name);
      } else {
        this.businessName = this.tenantSlug.replace(/-/g, ' ');
      }
      this.cdr.markForCheck();
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
      this.stepTitle = 'Elegir profesional';
      this.stepSubtitle = 'Selecciona el profesional para tu turno.';
      if (!this.flow.value.service) {
        await this.router.navigateByUrl(`/${this.tenantSlug}/book/service`);
        return;
      }
      await this.loadStaffWithRetry();
    } else if (this.step === 3) {
      await businessLoad;
      this.stepTitle = 'Elegir fecha y hora';
      this.stepSubtitle = 'Escoge una franja con disponibilidad.';
      if (!this.flow.value.service || !this.flow.value.staff) {
        await this.router.navigateByUrl(`/${this.tenantSlug}/book/service`);
        return;
      }
      this.days = this.generateNextDays();
      this.selectedDay = this.days[0];
      await this.loadSlots();
    } else if (this.step === 4) {
      await businessLoad;
      this.stepTitle = 'Confirmar reserva';
      this.stepSubtitle = 'Completa tus datos para confirmar.';
      if (!this.flow.value.service || !this.flow.value.staff || !this.flow.value.startsAt) {
        await this.router.navigateByUrl(`/${this.tenantSlug}/book/service`);
      }
    } else if (this.step === 5) {
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

  pickStaff(staff: PublicStaff): void {
    this.flow.selectStaff(staff);
  }

  async pickDay(day: string): Promise<void> {
    this.selectedDay = day;
    await this.loadSlots();
  }

  pickSlot(slot: string): void {
    this.flow.selectSlot(slot);
  }

  canContinue(): boolean {
    if (this.step === 1) return !!this.flow.value.service;
    if (this.step === 2) return !!this.flow.value.staff;
    if (this.step === 3) return !!this.flow.value.startsAt;
    return false;
  }

  canReserve(): boolean {
    return !!this.customerName && !!this.customerEmail && !!this.flow.value.startsAt;
  }

  async goNext(): Promise<void> {
    if (this.step === 1) await this.router.navigateByUrl(`/${this.tenantSlug}/book/staff`);
    if (this.step === 2) await this.router.navigateByUrl(`/${this.tenantSlug}/book/date-time`);
    if (this.step === 3) await this.router.navigateByUrl(`/${this.tenantSlug}/book/confirm`);
  }

  async goPrev(): Promise<void> {
    if (this.step === 2) await this.router.navigateByUrl(`/${this.tenantSlug}/book/service`);
    if (this.step === 3) await this.router.navigateByUrl(`/${this.tenantSlug}/book/staff`);
    if (this.step === 4) await this.router.navigateByUrl(`/${this.tenantSlug}/book/date-time`);
  }

  async reserve(): Promise<void> {
    if (!this.flow.value.service || !this.flow.value.staff || !this.flow.value.startsAt) return;
    const result = await firstValueFrom(
      this.api.createBooking(this.tenantSlug, {
        serviceId: this.flow.value.service.id,
        staffId: this.flow.value.staff.id,
        startsAt: this.flow.value.startsAt,
        customerName: this.customerName,
        customerEmail: this.customerEmail,
        customerPhone: this.customerPhone,
      }),
    );
    rememberBooking({
      tenantSlug: this.tenantSlug,
      code: result.code,
      at: new Date().toISOString(),
    });
    this.flow.reset();
    await this.router.navigateByUrl(`/${this.tenantSlug}/book/success/${result.code}`);
  }

  private generateNextDays(): string[] {
    const days: string[] = [];
    const current = new Date();
    for (let i = 0; i < 5; i += 1) {
      const next = new Date(current);
      next.setDate(current.getDate() + i);
      days.push(next.toISOString().slice(0, 10));
    }
    return days;
  }

  private async loadSlots(): Promise<void> {
    if (!this.flow.value.service || !this.flow.value.staff) return;
    const availability = await firstValueFrom(
      this.api.getAvailability(this.tenantSlug, this.flow.value.service.id, this.flow.value.staff.id, this.selectedDay),
    );
    this.slots = availability.slots;
  }

  async reloadServices(): Promise<void> {
    await this.loadServicesWithRetry();
  }

  async reloadStaff(): Promise<void> {
    await this.loadStaffWithRetry();
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

  private async loadStaffWithRetry(): Promise<void> {
    if (!this.flow.value.service) return;
    this.staffLoading = true;
    this.staffError = false;
    this.cdr.markForCheck();
    try {
      this.staff = await firstValueFrom(
        this.api.getStaff(this.tenantSlug, this.flow.value.service.id).pipe(
          timeout(8000),
          catchError(() => of([] as PublicStaff[])),
        ),
      );
      this.cdr.markForCheck();
      if (this.staff.length > 0) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 350));
      this.staff = await firstValueFrom(
        this.api.getStaff(this.tenantSlug, this.flow.value.service.id).pipe(
          timeout(8000),
          catchError(() => of([] as PublicStaff[])),
        ),
      );
      this.staffError = this.staff.length === 0;
    } catch {
      this.staff = [];
      this.staffError = true;
    } finally {
      this.staffLoading = false;
      this.cdr.markForCheck();
    }
  }
}
