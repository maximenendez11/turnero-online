import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigService } from '../../../core/services/config.service';

export type PublicBusiness = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string;
  locality: string | null;
  neighborhood: string | null;
};

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  price: string;
  depositMode: 'none' | 'fixed' | 'percent';
  depositValue: string;
};

export type PublicStaff = {
  id: string;
  fullName: string;
  bio: string | null;
  avatarUrl: string | null;
};

export type AvailabilityResponse = { slots: string[] };

export type CreateBookingPayload = {
  serviceId: string;
  staffId: string;
  startsAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
};

@Injectable({ providedIn: 'root' })
export class PublicBookingApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private api(path: string): string {
    return `${this.config.getApiUrl()}/public${path}`;
  }

  searchBusinesses(query: string): Observable<PublicBusiness[]> {
    const params = query ? new HttpParams().set('query', query) : undefined;
    return this.http.get<PublicBusiness[]>(this.api('/businesses'), { params });
  }

  getBusiness(slug: string): Observable<any> {
    return this.http.get(this.api(`/businesses/${slug}`));
  }

  getServices(slug: string): Observable<PublicService[]> {
    return this.http.get<PublicService[] | { services?: PublicService[] }>(this.api(`/businesses/${slug}/services`)).pipe(
      map((response) => this.asArray<PublicService>(response, 'services')),
    );
  }

  getStaff(slug: string, serviceId: string): Observable<PublicStaff[]> {
    const params = new HttpParams().set('serviceId', serviceId);
    return this.http.get<PublicStaff[] | { staff?: PublicStaff[] }>(this.api(`/businesses/${slug}/staff`), { params }).pipe(
      map((response) => this.asArray<PublicStaff>(response, 'staff')),
    );
  }

  getAvailability(slug: string, serviceId: string, staffId: string, date: string): Observable<AvailabilityResponse> {
    const params = new HttpParams().set('serviceId', serviceId).set('staffId', staffId).set('date', date);
    return this.http.get<AvailabilityResponse>(this.api(`/businesses/${slug}/availability`), { params });
  }

  createBooking(slug: string, payload: CreateBookingPayload): Observable<{ code: string }> {
    return this.http.post<{ code: string }>(this.api(`/businesses/${slug}/bookings`), payload);
  }

  getBooking(slug: string, code: string): Observable<any> {
    return this.http.get(this.api(`/businesses/${slug}/bookings/${code}`));
  }

  private asArray<T>(value: unknown, key: string): T[] {
    if (Array.isArray(value)) return value as T[];
    if (value && typeof value === 'object' && 'id' in (value as Record<string, unknown>)) {
      return [value as T];
    }
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const nestedKeys = [key, 'data', 'items', 'results'] as const;
      for (const k of nestedKeys) {
        const v = obj[k];
        if (Array.isArray(v)) return v as T[];
      }
    }
    return [];
  }
}
