import { Injectable, signal } from '@angular/core';
import { PublicService } from './public-booking-api.service';

type BookingFlowState = {
  service: PublicService | null;
  startsAt: string | null;
};

@Injectable({ providedIn: 'root' })
export class BookingFlowService {
  private readonly state = signal<BookingFlowState>({
    service: null,
    startsAt: null,
  });

  get value(): BookingFlowState {
    return this.state();
  }

  selectService(service: PublicService): void {
    this.state.set({ service, startsAt: null });
  }

  selectSlot(startsAt: string): void {
    this.state.set({ ...this.state(), startsAt });
  }

  reset(): void {
    this.state.set({ service: null, startsAt: null });
  }
}
