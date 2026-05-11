import { Injectable, signal } from '@angular/core';
import { PublicService } from './public-booking-api.service';

type BookingFlowState = {
  service: PublicService | null;
  startsAt: string | null;
};

/** Caché en memoria del tema del booking (las rutas por paso destruyen el componente). */
export type BookingShellCache = {
  themeBackgroundHex: string | null;
  themePrimaryHex: string | null;
  businessName: string;
};

@Injectable({ providedIn: 'root' })
export class BookingFlowService {
  private readonly state = signal<BookingFlowState>({
    service: null,
    startsAt: null,
  });

  private readonly shellBySlug = new Map<string, BookingShellCache>();

  get value(): BookingFlowState {
    return this.state();
  }

  peekBookingShell(slug: string): BookingShellCache | null {
    return this.shellBySlug.get(slug) ?? null;
  }

  rememberBookingShell(slug: string, snap: BookingShellCache): void {
    this.shellBySlug.set(slug, { ...snap });
  }

  selectService(service: PublicService): void {
    this.state.set({ service, startsAt: null });
  }

  selectSlot(startsAt: string | null): void {
    this.state.set({ ...this.state(), startsAt });
  }

  reset(): void {
    this.state.set({ service: null, startsAt: null });
  }
}
