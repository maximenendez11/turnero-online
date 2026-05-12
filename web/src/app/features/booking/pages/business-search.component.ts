import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PublicBookingApiService, PublicBusinessListItem } from '../services/public-booking-api.service';

@Component({
  standalone: true,
  selector: 'app-business-search',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="search-shell">
      <section class="search-card">
        <h1>Buscar Empresa</h1>
        <div class="search-row">
          <input [(ngModel)]="query" placeholder="Buscar empresa..." />
          <button type="button" (click)="search()">Buscar</button>
        </div>

        <p class="hint" *ngIf="!results.length">Escribe un rubro o nombre para comenzar.</p>

        <a class="result" *ngFor="let business of results" [routerLink]="['/', business.slug]">
          <h3>{{ business.name }}</h3>
          <p>{{ business.description || business.address }}</p>
        </a>
      </section>
    </main>
  `,
  styles: [
    `
      .search-shell {
        min-height: 100vh;
        background: #131313;
        padding: 1rem;
      }
      .search-card {
        width: min(780px, 100%);
        margin: 0 auto;
        background: rgba(30, 30, 30, 0.8);
        border: 1px solid #2d2d30;
        border-radius: 1rem;
        padding: 1rem;
        color: #e5e2e1;
      }
      h1 {
        margin: 0 0 0.9rem;
      }
      .search-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 0.5rem;
      }
      input {
        border: 1px solid #424754;
        background: #1c1b1b;
        color: #e5e2e1;
        border-radius: 0.6rem;
        padding: 0.7rem 0.8rem;
      }
      button {
        border: 0;
        border-radius: 0.6rem;
        background: #adc6ff;
        color: #002e6a;
        font-weight: 700;
        padding: 0.7rem 0.9rem;
      }
      .hint {
        color: #8c909f;
        margin-top: 0.8rem;
      }
      .result {
        display: block;
        margin-top: 0.7rem;
        text-decoration: none;
        border: 1px solid #2d2d30;
        border-radius: 0.8rem;
        padding: 0.75rem;
        color: #e5e2e1;
      }
      .result p {
        margin: 0.3rem 0 0;
        color: #c2c6d6;
      }
    `,
  ],
})
export class BusinessSearchComponent {
  private readonly api = inject(PublicBookingApiService);
  query = '';
  results: PublicBusinessListItem[] = [];

  search(): void {
    this.api.searchBusinesses(this.query).subscribe((items) => (this.results = items));
  }
}
