import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from './config.service';

export type AdminBusinessListItem = {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  ownerUserId: string | null;
  address: string;
  timezone: string;
  bookingIntervalMin: number;
  themeBackgroundHex?: string | null;
  themePrimaryHex?: string | null;
  /** Presente en `GET /admin/businesses` (resumen + horarios para dashboard). */
  openingWindows?: AdminOpeningWindow[];
};

export type AdminOpeningWindow = {
  id: string;
  weekday: number;
  startMin: number;
  endMin: number;
  sortOrder: number;
};

export type AdminServiceSchedulingType = 'regular' | 'variable_date' | 'cupos';

export type AdminServiceStaffLink = { staffId: string };

export type AdminServiceRow = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  price: unknown;
  priceOnRequest: boolean;
  depositPercent: number | null;
  modalityPresencial: boolean;
  modalityOnline: boolean;
  modalityDomicilio: boolean;
  schedulingType: AdminServiceSchedulingType;
  reminderClarifications: string | null;
  isActive: boolean;
  imageUrl?: string | null;
  imageUrl2?: string | null;
  imageUrl3?: string | null;
  /** Asignación explícita; vacío en API = todos los profesionales. */
  staffIds: string[];
  eligibleStaff?: AdminServiceStaffLink[];
};

export type AdminStaffRow = {
  id: string;
  displayName: string;
  role: string | null;
  photoUrl: string | null;
  sortOrder: number;
  /** Vidriera pública: si es false, no se lista en la landing (sigue disponible para servicios). */
  showOnLanding: boolean;
};

export type AdminBusinessDetail = AdminBusinessListItem & {
  description: string | null;
  openingWindows: AdminOpeningWindow[];
  services: AdminServiceRow[];
  staff: AdminStaffRow[];
  themeBackgroundHex?: string | null;
  themePrimaryHex?: string | null;
  bannerImageUrl?: string | null;
  socialWhatsappUrl?: string | null;
  socialInstagramUrl?: string | null;
  socialFacebookUrl?: string | null;
  ratingAverage?: number | null;
  ratingCount?: number;
};

export type AdminBookingRow = {
  id: string;
  code: string;
  startsAt: string;
  durationMin: number;
  status: string;
  customerFullName: string;
  customerContact: string;
  service: { id: string; name: string };
  business: { id: string; name: string; slug: string | null };
};

export type AdminAgendaBlockRow = {
  id: string;
  businessId: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
};

export type AgendaBlockOnConflict = 'fail' | 'cancel_silent' | 'cancel_with_notice';

export type AdminAgendaBlockConflict = {
  id: string;
  code: string;
  startsAt: string;
  durationMin: number;
  status: string;
  customerFullName: string;
  customerContact: string;
  service: { name: string };
};

export type CreateAgendaBlockBody = {
  startsAt: string;
  endsAt: string;
  reason: string;
  dryRun?: boolean;
  onConflict?: AgendaBlockOnConflict;
};

export type AdminAgendaBlockDryRunResponse = {
  dryRun: true;
  conflicts: AdminAgendaBlockConflict[];
};

export type AdminAgendaBlockCreateResponse = {
  dryRun: false;
  block: AdminAgendaBlockRow;
  cancelledBookingIds: string[];
  notices: { bookingId: string; emailSent: boolean; whatsappUrl: string | null }[];
};

export type AdminAgendaBlockCreateResult = AdminAgendaBlockDryRunResponse | AdminAgendaBlockCreateResponse;

export type AdminDashboardMetricsByBusiness = {
  businessId: string;
  businessName: string;
  timeZone: string;
  todayConfirmed: number;
};

export type AdminDashboardMetrics = {
  generatedAt: string;
  todayConfirmed: number;
  byBusiness: AdminDashboardMetricsByBusiness[];
};

export type AdminCustomerRow = {
  customerFullName: string;
  customerContact: string;
  lastAttendedAt: string | null;
  lastServiceName: string | null;
  visitsTotal: number;
  revenueThisMonth: number;
};

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private url(path: string): string {
    return `${this.config.getApiUrl()}/admin${path}`;
  }

  /**
   * Evita 304 + cuerpo vacío en el navegador (Angular recibe null → lista vacía en pantalla).
   * curl sin caché sigue viendo JSON; el cliente SPA reutilizaba ETag y perdía el body.
   */
  private cacheBustParams(extra?: Record<string, string>): HttpParams {
    let p = new HttpParams().set('_cb', String(Date.now()));
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        p = p.set(k, v);
      }
    }
    return p;
  }

  private jsonNoCacheHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
    });
  }

  getBusinesses(): Observable<AdminBusinessListItem[]> {
    return this.http.get<AdminBusinessListItem[]>(this.url('/businesses'), {
      params: this.cacheBustParams(),
      headers: this.jsonNoCacheHeaders(),
    });
  }

  getDashboardMetrics(): Observable<AdminDashboardMetrics> {
    return this.http.get<AdminDashboardMetrics>(this.url('/dashboard/metrics'), {
      params: this.cacheBustParams(),
      headers: this.jsonNoCacheHeaders(),
    });
  }

  getBusiness(id: string): Observable<AdminBusinessDetail> {
    return this.http.get<AdminBusinessDetail>(this.url(`/businesses/${id}`), {
      params: this.cacheBustParams(),
      headers: this.jsonNoCacheHeaders(),
    });
  }

  patchBusiness(id: string, body: Record<string, unknown>): Observable<AdminBusinessDetail> {
    return this.http.patch<AdminBusinessDetail>(this.url(`/businesses/${id}`), body);
  }

  replaceOpeningWindows(
    businessId: string,
    windows: { weekday: number; startMin: number; endMin: number; sortOrder: number }[],
  ): Observable<AdminBusinessDetail> {
    return this.http.put<AdminBusinessDetail>(this.url(`/businesses/${businessId}/opening-windows`), { windows });
  }

  createService(
    businessId: string,
    body: Record<string, unknown>,
  ): Observable<AdminServiceRow> {
    return this.http.post<AdminServiceRow>(this.url(`/businesses/${businessId}/services`), body);
  }

  createStaffMember(
    businessId: string,
    body: { displayName: string; role?: string; photoUrl?: string; sortOrder?: number },
  ): Observable<AdminStaffRow> {
    return this.http.post<AdminStaffRow>(this.url(`/businesses/${businessId}/staff`), body);
  }

  deleteStaffMember(staffId: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(this.url(`/staff/${staffId}`));
  }

  patchStaffMember(
    staffId: string,
    body: {
      displayName?: string;
      role?: string | null;
      photoUrl?: string | null;
      sortOrder?: number;
      showOnLanding?: boolean;
    },
  ): Observable<AdminStaffRow> {
    return this.http.patch<AdminStaffRow>(this.url(`/staff/${staffId}`), body);
  }

  patchService(serviceId: string, body: Record<string, unknown>): Observable<AdminServiceRow> {
    return this.http.patch<AdminServiceRow>(this.url(`/services/${serviceId}`), body);
  }

  deleteService(serviceId: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(this.url(`/services/${serviceId}`));
  }

  uploadServiceImage(
    businessId: string,
    serviceId: string,
    slot: 1 | 2 | 3,
    file: File,
  ): Observable<{ url: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ url: string }>(this.url(`/businesses/${businessId}/services/${serviceId}/media`), fd, {
      params: new HttpParams().set('slot', String(slot)),
    });
  }

  getBookings(businessId?: string): Observable<AdminBookingRow[]> {
    const params = businessId
      ? this.cacheBustParams({ businessId })
      : this.cacheBustParams();
    return this.http.get<AdminBookingRow[]>(this.url('/bookings'), {
      params,
      headers: this.jsonNoCacheHeaders(),
    });
  }

  getCustomers(businessId: string): Observable<AdminCustomerRow[]> {
    const params = this.cacheBustParams({ businessId });
    return this.http.get<unknown>(this.url('/customers'), {
      params,
      headers: this.jsonNoCacheHeaders(),
    }).pipe(map((raw) => this.normalizeCustomersResponse(raw)));
  }

  private normalizeCustomersResponse(raw: unknown): AdminCustomerRow[] {
    if (raw == null) return [];
    if (!Array.isArray(raw)) return [];
    const out: AdminCustomerRow[] = [];
    for (const row of raw) {
      if (!row || typeof row !== 'object') continue;
      const o = row as Record<string, unknown>;
      const customerFullName = typeof o['customerFullName'] === 'string' ? o['customerFullName'] : '';
      const customerContact = typeof o['customerContact'] === 'string' ? o['customerContact'] : '';
      const lastAttendedAt =
        o['lastAttendedAt'] === null || o['lastAttendedAt'] === undefined
          ? null
          : typeof o['lastAttendedAt'] === 'string'
            ? o['lastAttendedAt']
            : null;
      const lastServiceName =
        o['lastServiceName'] === null || o['lastServiceName'] === undefined
          ? null
          : typeof o['lastServiceName'] === 'string'
            ? o['lastServiceName']
            : null;
      const visitsTotal =
        typeof o['visitsTotal'] === 'number' && Number.isFinite(o['visitsTotal']) ? o['visitsTotal'] : 0;
      const rev = o['revenueThisMonth'];
      const revenueThisMonth =
        typeof rev === 'number' && Number.isFinite(rev)
          ? rev
          : typeof rev === 'string' && rev.trim() !== '' && Number.isFinite(Number(rev))
            ? Number(rev)
            : 0;
      out.push({
        customerFullName,
        customerContact,
        lastAttendedAt,
        lastServiceName,
        visitsTotal,
        revenueThisMonth,
      });
    }
    return out;
  }

  patchBooking(bookingId: string, body: Record<string, unknown>): Observable<AdminBookingRow> {
    return this.http.patch<AdminBookingRow>(this.url(`/bookings/${bookingId}`), body);
  }

  createBooking(
    businessId: string,
    body: {
      serviceId: string;
      startsAt: string;
      customerFullName: string;
      customerContact?: string;
      status?: 'pending' | 'confirmed' | 'cancelled';
    },
  ): Observable<AdminBookingRow> {
    return this.http.post<AdminBookingRow>(this.url(`/businesses/${businessId}/bookings`), body);
  }

  getAgendaBlocks(businessId: string, fromIso: string, toIso: string): Observable<AdminAgendaBlockRow[]> {
    return this.http.get<AdminAgendaBlockRow[]>(this.url(`/businesses/${businessId}/agenda-blocks`), {
      params: this.cacheBustParams({ from: fromIso, to: toIso }),
      headers: this.jsonNoCacheHeaders(),
    });
  }

  createAgendaBlock(
    businessId: string,
    body: CreateAgendaBlockBody,
  ): Observable<AdminAgendaBlockCreateResult> {
    return this.http.post<AdminAgendaBlockCreateResult>(this.url(`/businesses/${businessId}/agenda-blocks`), body);
  }

  deleteAgendaBlock(blockId: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(this.url(`/agenda-blocks/${blockId}`));
  }

  uploadLandingMedia(businessId: string, file: File, kind: 'banner' | 'staff'): Observable<{ url: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ url: string }>(this.url(`/businesses/${businessId}/landing-media?kind=${kind}`), fd);
  }
}
