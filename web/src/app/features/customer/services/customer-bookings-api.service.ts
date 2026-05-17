import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';

export type MyBookingRow = {
  id: string;
  code: string;
  startsAt: string;
  durationMin: number;
  status: string;
  customerFullName: string;
  businessSlug: string;
  businessName: string;
  serviceName: string;
};

@Injectable({ providedIn: 'root' })
export class CustomerBookingsApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  listMyBookings(): Observable<MyBookingRow[]> {
    return this.http.get<MyBookingRow[]>(`${this.config.getApiUrl()}/customer/bookings`);
  }
}
