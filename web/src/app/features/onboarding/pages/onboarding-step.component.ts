import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { OnboardingApiService } from '../../../core/services/onboarding-api.service';
import { OnboardingDraft, OnboardingService } from '../../../core/services/onboarding.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';

type OnboardingData = {
  step: number;
  total: number;
  title: string;
  description: string;
  fields: string[];
  next?: string;
  prev?: string;
};

@Component({
  standalone: true,
  selector: 'app-onboarding-step',
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <main class="onboarding-shell">
      <header>
        <p>Paso {{ data.step }} de {{ data.total }}</p>
        <div class="progress"><span [style.width.%]="(data.step / data.total) * 100"></span></div>
      </header>
      <section class="card">
        <h1>{{ data.title }}</h1>
        <p>{{ data.description }}</p>
        <form (submit)="$event.preventDefault()">
          <ng-container [ngSwitch]="stepId">
            <ng-container *ngSwitchCase="'business-profile'">
              <label>
                <span>Nombre del negocio</span>
                <input [(ngModel)]="draft.businessName" name="businessName" type="text" />
              </label>
              <label>
                <span>Categoria</span>
                <input [(ngModel)]="draft.businessCategory" name="businessCategory" type="text" />
              </label>
              <label>
                <span>Descripcion</span>
                <input [(ngModel)]="draft.businessDescription" name="businessDescription" type="text" />
              </label>
              <label>
                <span>Direccion</span>
                <input [(ngModel)]="draft.address" name="address" type="text" />
              </label>
            </ng-container>

            <ng-container *ngSwitchCase="'services'">
              <label>
                <span>Servicio principal</span>
                <input [(ngModel)]="draft.serviceName" name="serviceName" type="text" />
              </label>
              <label>
                <span>Duracion (min)</span>
                <input [(ngModel)]="draft.serviceDurationMin" name="serviceDurationMin" type="number" />
              </label>
              <label>
                <span>Precio</span>
                <input [(ngModel)]="draft.servicePrice" name="servicePrice" type="number" />
              </label>
            </ng-container>

            <ng-container *ngSwitchCase="'schedule'">
              <label>
                <span>Horario de apertura</span>
                <input [(ngModel)]="draft.openingHours" name="openingHours" type="text" />
              </label>
              <label>
                <span>Intervalo de reservas (min)</span>
                <input [(ngModel)]="draft.bookingIntervalMin" name="bookingIntervalMin" type="number" />
              </label>
              <label>
                <span>Maximo por franja</span>
                <input
                  [(ngModel)]="draft.maxAppointmentsPerSlot"
                  name="maxAppointmentsPerSlot"
                  type="number"
                />
              </label>
              <label>
                <span>Zona horaria</span>
                <input [(ngModel)]="draft.timezone" name="timezone" type="text" />
              </label>
            </ng-container>

            <ng-container *ngSwitchCase="'payments'">
              <label class="check">
                <input [(ngModel)]="draft.requiresDeposit" name="requiresDeposit" type="checkbox" />
                <span>Requerir deposito para reservar</span>
              </label>
              <label>
                <span>Modo deposito</span>
                <select [(ngModel)]="draft.depositMode" name="depositMode">
                  <option value="none">Sin deposito</option>
                  <option value="fixed">Monto fijo</option>
                  <option value="percent">Porcentaje</option>
                </select>
              </label>
              <label>
                <span>Valor deposito</span>
                <input [(ngModel)]="draft.depositValue" name="depositValue" type="number" />
              </label>
              <label>
                <span>Moneda</span>
                <input [(ngModel)]="draft.currency" name="currency" type="text" />
              </label>
            </ng-container>

            <ng-container *ngSwitchDefault>
              <div class="review">
                <p><strong>Negocio:</strong> {{ draft.businessName || '-' }}</p>
                <p><strong>Categoria:</strong> {{ draft.businessCategory || '-' }}</p>
                <p><strong>Horario:</strong> {{ draft.openingHours || '-' }}</p>
                <p><strong>Servicio:</strong> {{ draft.serviceName || '-' }} ({{ draft.servicePrice || 0 }})</p>
                <p><strong>Deposito:</strong> {{ draft.requiresDeposit ? 'Si' : 'No' }}</p>
                <p><strong>Link publico:</strong></p>
                <code>{{ bookingLink || '(completa nombre del negocio)' }}</code>
              </div>
            </ng-container>
          </ng-container>
        </form>
      </section>
      <p class="setup-error" *ngIf="setupError()">{{ setupError() }}</p>
      <footer>
        <a *ngIf="data.prev" [routerLink]="data.prev">Anterior</a>
        <button
          class="primary"
          *ngIf="data.next"
          type="button"
          [disabled]="submitting()"
          (click)="continue()"
        >
          {{ submitting() ? 'Guardando…' : 'Continuar' }}
        </button>
      </footer>
    </main>
  `,
  styles: [
    `
      .onboarding-shell {
        min-height: 100vh;
        background: #131313;
        padding: 1rem;
        color: #e5e2e1;
      }
      header,
      .card,
      footer {
        width: min(680px, 100%);
        margin: 0 auto;
      }
      p {
        color: #c2c6d6;
      }
      .progress {
        width: 100%;
        height: 6px;
        border-radius: 999px;
        background: #2a2a2a;
        margin: 0.5rem 0 1rem;
        overflow: hidden;
      }
      .progress span {
        display: block;
        height: 100%;
        background: #adc6ff;
      }
      .card {
        background: rgba(30, 30, 30, 0.8);
        border: 1px solid #2d2d30;
        border-radius: 1rem;
        padding: 1.1rem;
      }
      h1 {
        margin: 0;
      }
      form {
        display: grid;
        gap: 0.75rem;
        margin-top: 0.75rem;
      }
      label {
        display: grid;
        gap: 0.3rem;
      }
      .check {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      span {
        font-size: 0.75rem;
        text-transform: uppercase;
        color: #c2c6d6;
      }
      input {
        background: #1c1b1b;
        border: 1px solid #424754;
        border-radius: 0.6rem;
        color: #e5e2e1;
        padding: 0.7rem 0.8rem;
      }
      select {
        background: #1c1b1b;
        border: 1px solid #424754;
        border-radius: 0.6rem;
        color: #e5e2e1;
        padding: 0.7rem 0.8rem;
      }
      .review {
        background: #171717;
        border: 1px solid #2d2d30;
        border-radius: 0.8rem;
        padding: 0.8rem;
      }
      .review p {
        margin: 0.35rem 0;
      }
      code {
        display: inline-block;
        padding: 0.35rem 0.5rem;
        border-radius: 0.45rem;
        border: 1px solid #424754;
        color: #adc6ff;
      }
      .setup-error {
        width: min(680px, 100%);
        margin: 0.75rem auto 0;
        padding: 0.65rem 0.85rem;
        border-radius: 0.6rem;
        border: 1px solid #5c2a2a;
        background: #2a1717;
        color: #ffb4a9;
        font-size: 0.9rem;
      }
      footer {
        display: flex;
        justify-content: space-between;
        margin-top: 1rem;
      }
      a {
        color: #c2c6d6;
        text-decoration: none;
      }
      .primary {
        color: #002e6a;
        background: #adc6ff;
        border: 0;
        border-radius: 0.75rem;
        padding: 0.62rem 1rem;
        font-weight: 700;
        cursor: pointer;
      }
      .primary:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }
    `,
  ],
})
export class OnboardingStepComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly onboardingService = inject(OnboardingService);
  private readonly onboardingApi = inject(OnboardingApiService);
  readonly data = this.route.snapshot.data as OnboardingData;
  readonly stepId = this.route.snapshot.routeConfig?.path?.split('/').pop() ?? 'business-profile';
  readonly setupError = signal<string | null>(null);
  readonly submitting = signal(false);
  draft: OnboardingDraft = { ...this.onboardingService.getDraft() };

  get bookingLink(): string | null {
    return this.onboardingService.getPublicBookingPath(this.draft);
  }

  async continue(): Promise<void> {
    if (!this.data.next) {
      return;
    }
    this.onboardingService.patchDraft(this.draft);
    if (this.data.next === '/app/dashboard') {
      this.setupError.set(null);
      this.submitting.set(true);
      try {
        await firstValueFrom(this.onboardingApi.setup(this.draft));
        this.onboardingService.markCompleted();
      } catch (err) {
        this.setupError.set(apiErrorMessage(err));
        this.submitting.set(false);
        return;
      }
      this.submitting.set(false);
    }
    await this.router.navigateByUrl(this.data.next);
  }
}
