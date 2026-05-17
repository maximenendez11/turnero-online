import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SessionService } from '../../../core/services/session.service';
import { PublicBookingApiService } from '../../booking/services/public-booking-api.service';
import {
  CustomerBookingModalComponent,
  type CustomerBookingDetail,
} from '../components/customer-booking-modal/customer-booking-modal.component';
import {
  CustomerBookingsApiService,
  type MyBookingRow,
} from '../services/customer-bookings-api.service';

type CustomerPageData = {
  title: string;
  subtitle: string;
};

@Component({
  standalone: true,
  selector: 'app-customer-page',
  imports: [CommonModule, CustomerBookingModalComponent],
  templateUrl: './customer-page.component.html',
  styleUrl: './customer-page.component.scss',
})
export class CustomerPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PublicBookingApiService);
  private readonly customerBookings = inject(CustomerBookingsApiService);
  private readonly session = inject(SessionService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly data = this.route.snapshot.data as CustomerPageData;
  readonly tenantSlug = this.route.snapshot.paramMap.get('tenantSlug') ?? '';
  readonly accountEmail = this.session.getEmail();

  readonly selectedBooking = signal<MyBookingRow | null>(null);
  readonly bookingDetail = signal<CustomerBookingDetail | null>(null);
  readonly bookingDetailLoading = signal(false);
  readonly bookingDetailError = signal('');

  readonly bookingSkeletonSlots = [1, 2, 3, 4];

  myBookings: MyBookingRow[] = [];
  myBookingsLoading = false;
  myBookingsError = '';
  isAppointmentsHub = false;
  isProfile = false;

  ngOnInit(): void {
    const path = this.route.snapshot.routeConfig?.path ?? '';
    this.isAppointmentsHub = path === 'appointments';
    this.isProfile = path === 'profile';
    if (this.isAppointmentsHub) {
      void this.loadMyBookings();
    }
    const bookingCode = this.route.snapshot.paramMap.get('bookingCode');
    if (bookingCode && this.tenantSlug) {
      void this.openBookingFromRoute(bookingCode, this.tenantSlug);
    }
  }

  private async openBookingFromRoute(code: string, businessSlug: string): Promise<void> {
    this.selectedBooking.set({
      id: '',
      code,
      businessSlug,
      businessName: businessSlug,
      serviceName: 'Reserva',
      startsAt: new Date().toISOString(),
      durationMin: 0,
      status: 'confirmed',
      customerFullName: '',
    });
    this.bookingDetail.set(null);
    this.bookingDetailError.set('');
    this.bookingDetailLoading.set(true);
    this.lockBodyScroll();
    try {
      const detail = await firstValueFrom(this.api.getBooking(businessSlug, code));
      this.bookingDetail.set(detail as CustomerBookingDetail);
      this.selectedBooking.set({
        id: '',
        code,
        businessSlug,
        businessName: detail.business?.name ?? businessSlug,
        serviceName: detail.service?.name ?? 'Reserva',
        startsAt: detail.startsAt ?? new Date().toISOString(),
        durationMin: detail.durationMin ?? 0,
        status: detail.status ?? 'confirmed',
        customerFullName: detail.customerFullName ?? '',
      });
    } catch {
      this.bookingDetailError.set('No se pudo cargar el detalle del turno.');
    } finally {
      this.bookingDetailLoading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.unlockBodyScroll();
  }

  async openBookingModal(row: MyBookingRow): Promise<void> {
    this.selectedBooking.set(row);
    this.bookingDetail.set(null);
    this.bookingDetailError.set('');
    this.bookingDetailLoading.set(true);
    this.lockBodyScroll();
    try {
      const detail = await firstValueFrom(this.api.getBooking(row.businessSlug, row.code));
      this.bookingDetail.set(detail as CustomerBookingDetail);
    } catch {
      this.bookingDetailError.set('No se pudo cargar el detalle del turno.');
    } finally {
      this.bookingDetailLoading.set(false);
    }
  }

  closeBookingModal(): void {
    this.selectedBooking.set(null);
    this.bookingDetail.set(null);
    this.bookingDetailError.set('');
    this.bookingDetailLoading.set(false);
    this.unlockBodyScroll();
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      cancelled: 'Cancelado',
    };
    return map[status] ?? status;
  }

  statusModifier(status: string): 'pending' | 'confirmed' | 'cancelled' {
    if (status === 'pending') return 'pending';
    if (status === 'cancelled') return 'cancelled';
    return 'confirmed';
  }

  private async loadMyBookings(): Promise<void> {
    this.myBookingsLoading = true;
    this.myBookingsError = '';
    try {
      this.myBookings = await firstValueFrom(this.customerBookings.listMyBookings());
    } catch {
      this.myBookings = [];
      this.myBookingsError = 'No se pudieron cargar tus turnos. Reintentá en unos segundos.';
    } finally {
      this.myBookingsLoading = false;
    }
  }

  private lockBodyScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.body.style.overflow = '';
  }
}
