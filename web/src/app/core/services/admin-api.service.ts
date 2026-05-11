import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
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
};

export type AdminOpeningWindow = {
  id: string;
  weekday: number;
  startMin: number;
  endMin: number;
  sortOrder: number;
};

export type AdminServiceRow = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  price: unknown;
  isActive: boolean;
};

export type AdminBusinessDetail = AdminBusinessListItem & {
  description: string | null;
  openingWindows: AdminOpeningWindow[];
  services: AdminServiceRow[];
  themeBackgroundHex?: string | null;
  themePrimaryHex?: string | null;
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
    body: { name: string; description?: string; durationMin: number; price: number },
  ): Observable<AdminServiceRow> {
    return this.http.post<AdminServiceRow>(this.url(`/businesses/${businessId}/services`), body);
  }

  patchService(serviceId: string, body: Record<string, unknown>): Observable<AdminServiceRow> {
    return this.http.patch<AdminServiceRow>(this.url(`/services/${serviceId}`), body);
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

  patchBooking(bookingId: string, body: Record<string, unknown>): Observable<AdminBookingRow> {
    return this.http.patch<AdminBookingRow>(this.url(`/bookings/${bookingId}`), body);
  }
}
