import { Injectable, signal } from '@angular/core';
import { PublicService, PublicStaff } from './public-booking-api.service';

type BookingFlowState = {
  service: PublicService | null;
  staff: PublicStaff | null;
  startsAt: string | null;
};

@Injectable({ providedIn: 'root' })
export class BookingFlowService {
  private readonly state = signal<BookingFlowState>({
    service: null,
    staff: null,
    startsAt: null,
  });

  get value(): BookingFlowState {
    return this.state();
  }

  selectService(service: PublicService): void {
    this.state.set({ service, staff: null, startsAt: null });
  }

  selectStaff(staff: PublicStaff): void {
    this.state.set({ ...this.state(), staff, startsAt: null });
  }

  selectSlot(startsAt: string): void {
    this.state.set({ ...this.state(), startsAt });
  }

  reset(): void {
    this.state.set({ service: null, staff: null, startsAt: null });
  }
}
