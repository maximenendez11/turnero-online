import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { PublicBookingApiService } from '../../booking/services/public-booking-api.service';
import { readRecentBookings, type RecentBookingEntry } from '../recent-bookings.storage';

type CustomerPageData = {
  title: string;
  subtitle: string;
};

@Component({
  standalone: true,
  selector: 'app-customer-page',
  imports: [RouterLink, CommonModule],
  template: `
    <main class="customer-shell">
      <section class="card">
        <nav>
          <a routerLink="/c/profile">Perfil</a>
          <a routerLink="/c/appointments">Mis turnos</a>
          <a routerLink="/c/search">Buscar comercio</a>
        </nav>
        <h1>{{ data.title }}</h1>
        <p>{{ data.subtitle }}</p>

        <div class="recent-block" *ngIf="isAppointmentsHub">
          <h2>Turnos en este dispositivo</h2>
          <p class="hint">
            Guardamos acá las reservas que hiciste desde este navegador. Para ver todas las asociadas a tu cuenta
            hará falta iniciar sesión cuando integremos auth de cliente.
          </p>
          <ul class="recent-list" *ngIf="recentBookings.length > 0">
            <li *ngFor="let b of recentBookings">
              <div>
                <strong>{{ b.code }}</strong>
                <span class="meta">{{ b.tenantSlug }} · {{ b.at | date: 'short' }}</span>
              </div>
              <a class="link" [routerLink]="['/', b.tenantSlug, 'manage', b.code]">Abrir</a>
            </li>
          </ul>
          <p class="empty" *ngIf="recentBookings.length === 0">Todavía no hay turnos guardados. Reservá en un comercio y aparecerá acá.</p>
        </div>

        <div class="booking-card" *ngIf="booking">
          <p><strong>Codigo:</strong> {{ booking.code }}</p>
          <p><strong>Servicio:</strong> {{ booking.service?.name }}</p>
          <p><strong>Profesional:</strong> {{ booking.staff?.fullName }}</p>
          <p><strong>Horario:</strong> {{ booking.startsAt | date: 'dd/MM HH:mm' }}</p>
          <p><strong>Estado:</strong> {{ booking.status }}</p>
          <a class="back-link" routerLink="/c/appointments">Volver a mis turnos</a>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      .customer-shell {
        min-height: 100vh;
        padding: 1rem;
        background: #131313;
      }
      .card {
        width: min(720px, 100%);
        margin: 0 auto;
        background: rgba(30, 30, 30, 0.8);
        border: 1px solid #2d2d30;
        border-radius: 0.95rem;
        padding: 1rem;
      }
      nav {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
        margin-bottom: 0.75rem;
      }
      nav a {
        text-decoration: none;
        color: #adc6ff;
        border: 1px solid #2d2d30;
        border-radius: 0.6rem;
        padding: 0.36rem 0.55rem;
        font-size: 0.85rem;
      }
      h1 {
        margin: 0;
        color: #e5e2e1;
      }
      h2 {
        margin: 1rem 0 0.35rem;
        font-size: 1rem;
        color: #e5e2e1;
      }
      p {
        color: #c2c6d6;
      }
      .hint {
        font-size: 0.88rem;
        margin-top: 0.25rem;
      }
      .recent-list {
        list-style: none;
        padding: 0;
        margin: 0.75rem 0 0;
        display: grid;
        gap: 0.5rem;
      }
      .recent-list li {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        border: 1px solid #2d2d30;
        border-radius: 0.75rem;
        padding: 0.65rem 0.75rem;
        background: #171717;
      }
      .recent-list .meta {
        display: block;
        font-size: 0.78rem;
        color: #8c909f;
        margin-top: 0.15rem;
      }
      .recent-list .link {
        flex-shrink: 0;
        text-decoration: none;
        color: #002e6a;
        background: #adc6ff;
        border-radius: 0.55rem;
        padding: 0.4rem 0.65rem;
        font-weight: 700;
        font-size: 0.85rem;
      }
      .empty {
        margin-top: 0.75rem;
        color: #8c909f;
      }
      .booking-card {
        margin-top: 0.8rem;
        border: 1px solid #2d2d30;
        border-radius: 0.8rem;
        padding: 0.8rem;
        background: #171717;
      }
      .booking-card p {
        margin: 0.35rem 0;
      }
      .back-link {
        display: inline-block;
        margin-top: 0.75rem;
        color: #adc6ff;
        font-size: 0.9rem;
      }
    `,
  ],
})
export class CustomerPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PublicBookingApiService);
  readonly data = this.route.snapshot.data as CustomerPageData;
  readonly tenantSlug = this.route.snapshot.paramMap.get('tenantSlug') ?? '';
  booking: any = null;
  recentBookings: RecentBookingEntry[] = [];
  isAppointmentsHub = false;

  ngOnInit(): void {
    this.isAppointmentsHub = this.route.snapshot.routeConfig?.path === 'c/appointments';
    this.recentBookings = readRecentBookings();
    const bookingCode = this.route.snapshot.paramMap.get('bookingCode');
    if (bookingCode && this.tenantSlug) {
      void this.loadBooking(bookingCode);
    }
  }

  private async loadBooking(code: string): Promise<void> {
    this.booking = await firstValueFrom(this.api.getBooking(this.tenantSlug, code));
  }
}
