import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ConfigService } from '../../../core/services/config.service';

export type PublicBusinessListItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string;
};

export type PublicStaffMember = {
  id: string;
  displayName: string;
  role: string | null;
  photoUrl: string | null;
};

export type PublicBusiness = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string;
  timezone?: string | null;
  bookingIntervalMin?: number;
  themeBackgroundHex?: string | null;
  themePrimaryHex?: string | null;
  bannerImageUrl?: string | null;
  ratingAverage?: number | null;
  ratingCount?: number;
  services: PublicService[];
  staff: PublicStaffMember[];
};

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  price: string;
  priceOnRequest?: boolean;
  imageUrl?: string | null;
  imageUrl2?: string | null;
  imageUrl3?: string | null;
};

export type AvailabilityResponse = { slots: string[] };

export type CreateBookingPayload = {
  serviceId: string;
  startsAt: string;
  customerFullName: string;
  customerContact: string;
};

@Injectable({ providedIn: 'root' })
export class PublicBookingApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private api(path: string): string {
    return `${this.config.getApiUrl()}/public${path}`;
  }

  searchBusinesses(query: string): Observable<PublicBusinessListItem[]> {
    const params = query ? new HttpParams().set('query', query) : undefined;
    return this.http.get<PublicBusinessListItem[]>(this.api('/businesses'), { params });
  }

  getBusiness(slug: string): Observable<PublicBusiness | null> {
    return this.http.get<unknown>(this.api(`/businesses/${slug}`)).pipe(
      map((raw) => this.normalizeBusiness(raw)),
      catchError(() => of(null)),
    );
  }

  getServices(slug: string): Observable<PublicService[]> {
    return this.http.get<unknown>(this.api(`/businesses/${slug}/services`)).pipe(
      map((response) =>
        this.asArray<unknown>(response, 'services')
          .map((row) => this.normalizeService(row))
          .filter((x): x is PublicService => x !== null),
      ),
    );
  }

  getAvailability(slug: string, serviceId: string, date: string): Observable<AvailabilityResponse> {
    const params = new HttpParams().set('serviceId', serviceId).set('date', date);
    return this.http.get<AvailabilityResponse>(this.api(`/businesses/${slug}/availability`), { params });
  }

  createBooking(slug: string, payload: CreateBookingPayload): Observable<{ code: string }> {
    return this.http.post<{ code: string }>(this.api(`/businesses/${slug}/bookings`), payload);
  }

  getBooking(slug: string, code: string): Observable<any> {
    return this.http.get(this.api(`/businesses/${slug}/bookings/${code}`));
  }

  private normalizeBusiness(raw: unknown): PublicBusiness | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const id = typeof o['id'] === 'string' ? o['id'] : null;
    const s = typeof o['slug'] === 'string' ? o['slug'] : null;
    const name = typeof o['name'] === 'string' ? o['name'] : null;
    if (!id || !s || !name) return null;

    const servicesRaw = o['services'];
    const staffRaw = o['staff'];
    const services = Array.isArray(servicesRaw)
      ? (servicesRaw as unknown[])
          .map((row) => this.normalizeService(row))
          .filter((x): x is PublicService => x !== null)
      : [];
    const staff = Array.isArray(staffRaw)
      ? (staffRaw as unknown[])
          .map((row) => this.normalizeStaff(row))
          .filter((x): x is PublicStaffMember => x !== null)
      : [];

    const ratingAvg = o['ratingAverage'];
    const ratingCnt = o['ratingCount'];

    return {
      id,
      slug: s,
      name,
      description: typeof o['description'] === 'string' ? o['description'] : null,
      address: typeof o['address'] === 'string' ? o['address'] : '',
      timezone: typeof o['timezone'] === 'string' ? o['timezone'] : null,
      bookingIntervalMin: typeof o['bookingIntervalMin'] === 'number' ? o['bookingIntervalMin'] : undefined,
      themeBackgroundHex: typeof o['themeBackgroundHex'] === 'string' ? o['themeBackgroundHex'] : null,
      themePrimaryHex: typeof o['themePrimaryHex'] === 'string' ? o['themePrimaryHex'] : null,
      bannerImageUrl: typeof o['bannerImageUrl'] === 'string' ? o['bannerImageUrl'] : null,
      ratingAverage: typeof ratingAvg === 'number' && !Number.isNaN(ratingAvg) ? ratingAvg : null,
      ratingCount: typeof ratingCnt === 'number' && ratingCnt >= 0 ? ratingCnt : 0,
      services,
      staff,
    };
  }

  private normalizeService(raw: unknown): PublicService | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const id = typeof o['id'] === 'string' ? o['id'] : null;
    const svcName = typeof o['name'] === 'string' ? o['name'] : null;
    const durationMin = typeof o['durationMin'] === 'number' ? o['durationMin'] : null;
    const p = o['price'];
    const price =
      typeof p === 'string' ? p : typeof p === 'number' && !Number.isNaN(p) ? String(p) : null;
    const priceOnRequest = o['priceOnRequest'] === true;
    if (!id || !svcName || price === null || durationMin === null) return null;
    return {
      id,
      name: svcName,
      description: typeof o['description'] === 'string' ? o['description'] : null,
      durationMin,
      price,
      priceOnRequest,
      imageUrl: typeof o['imageUrl'] === 'string' ? o['imageUrl'] : null,
      imageUrl2: typeof o['imageUrl2'] === 'string' ? o['imageUrl2'] : null,
      imageUrl3: typeof o['imageUrl3'] === 'string' ? o['imageUrl3'] : null,
    };
  }

  private normalizeStaff(raw: unknown): PublicStaffMember | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const sid = typeof o['id'] === 'string' ? o['id'] : null;
    const displayName = typeof o['displayName'] === 'string' ? o['displayName'] : null;
    if (!sid || !displayName) return null;
    return {
      id: sid,
      displayName,
      role: typeof o['role'] === 'string' ? o['role'] : null,
      photoUrl: typeof o['photoUrl'] === 'string' ? o['photoUrl'] : null,
    };
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
