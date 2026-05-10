import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageStateComponent, PageStateKind } from '../../../shared/ui/page-state/page-state.component';
import { OnboardingService } from '../../../core/services/onboarding.service';

type WorkspaceData = {
  title: string;
  description: string;
  highlights: string[];
};

@Component({
  standalone: true,
  selector: 'app-workspace-page',
  imports: [CommonModule, RouterLink, PageStateComponent],
  template: `
    <main class="workspace-shell">
      <aside>
        <h2>Zenith</h2>
        <a routerLink="/app/dashboard">Dashboard</a>
        <a routerLink="/app/calendar">Calendario</a>
        <a routerLink="/app/appointments">Turnos</a>
        <a routerLink="/app/services">Servicios</a>
        <a routerLink="/app/customers">Clientes</a>
        <a routerLink="/app/analytics">Analiticas</a>
        <a routerLink="/app/subscription">Suscripcion</a>
        <a routerLink="/app/settings/business">Negocio</a>
      </aside>
      <section>
        <nav class="mobile-nav">
          <a routerLink="/app/dashboard">Dashboard</a>
          <a routerLink="/app/calendar">Calendario</a>
          <a routerLink="/app/appointments">Turnos</a>
          <a routerLink="/app/services">Servicios</a>
        </nav>
        <header>
          <h1>{{ data.title }}</h1>
          <p>{{ data.description }}</p>
          <a class="booking-link" *ngIf="publicBookingPath" [routerLink]="publicBookingPath">
            Link publico: {{ publicBookingPath }}
          </a>
        </header>
        <app-page-state
          *ngIf="stateMode !== 'ready'"
          [kind]="pageStateKind"
          [title]="stateTitle"
          [description]="stateDescription"
          [actionLabel]="stateActionLabel"
          [actionHref]="stateActionHref"
        />
        <div class="grid" *ngIf="stateMode === 'ready'">
          <article *ngFor="let h of data.highlights">
            <h3>{{ h }}</h3>
            <p>Estado, metricas y acciones rapidas para esta seccion.</p>
          </article>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      .workspace-shell {
        min-height: 100vh;
        background: #131313;
        color: #e5e2e1;
        display: grid;
        grid-template-columns: 1fr;
      }
      aside {
        display: none;
      }
      section {
        padding: 1rem;
      }
      h1 {
        margin: 0;
      }
      header p {
        color: #c2c6d6;
      }
      .booking-link {
        color: #adc6ff;
        text-decoration: none;
        display: inline-block;
        margin-top: 0.35rem;
      }
      .grid {
        display: grid;
        gap: 0.8rem;
        grid-template-columns: 1fr;
        margin-top: 1rem;
      }
      .mobile-nav {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.35rem;
        margin-bottom: 0.75rem;
      }
      .mobile-nav a {
        text-decoration: none;
        color: #c2c6d6;
        border: 1px solid #2d2d30;
        border-radius: 0.6rem;
        padding: 0.48rem 0.55rem;
        text-align: center;
      }
      article {
        background: rgba(30, 30, 30, 0.8);
        border: 1px solid #2d2d30;
        border-radius: 0.9rem;
        padding: 1rem;
      }
      article h3 {
        margin: 0;
      }
      article p {
        margin: 0.4rem 0 0;
        color: #c2c6d6;
      }
      @media (min-width: 920px) {
        .workspace-shell {
          grid-template-columns: 240px 1fr;
        }
        aside {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          border-right: 1px solid #2d2d30;
          padding: 1rem;
          background: #1c1b1b;
        }
        aside a {
          color: #c2c6d6;
          text-decoration: none;
          padding: 0.5rem 0.55rem;
          border-radius: 0.5rem;
        }
        aside a:hover {
          background: #2a2a2a;
          color: #adc6ff;
        }
        .grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .mobile-nav {
          display: none;
        }
      }
    `,
  ],
})
export class WorkspacePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly onboardingService = inject(OnboardingService);
  readonly data = this.route.snapshot.data as WorkspaceData;
  readonly stateMode = (this.route.snapshot.queryParamMap.get('state') ?? 'ready') as PageStateKind | 'ready';
  readonly pageStateKind: PageStateKind =
    this.stateMode === 'ready' ? 'loading' : (this.stateMode as PageStateKind);

  get stateTitle(): string {
    if (this.stateMode === 'loading') return 'Cargando informacion';
    if (this.stateMode === 'empty') return 'Sin datos por mostrar';
    if (this.stateMode === 'error') return 'No pudimos cargar esta seccion';
    return 'Operacion completada';
  }

  get stateDescription(): string {
    if (this.stateMode === 'loading') return 'Estamos sincronizando datos del tenant.';
    if (this.stateMode === 'empty') return 'Aun no hay registros. Crea tu primer elemento.';
    if (this.stateMode === 'error') return 'Reintenta en unos segundos o revisa la conexion.';
    return 'Los cambios fueron aplicados correctamente.';
  }

  get stateActionLabel(): string | null {
    if (this.stateMode === 'empty') return 'Crear ahora';
    if (this.stateMode === 'error') return 'Volver al dashboard';
    return null;
  }

  get stateActionHref(): string | null {
    if (this.stateMode === 'empty') return '/app/services';
    if (this.stateMode === 'error') return '/app/dashboard';
    return null;
  }

  get publicBookingPath(): string | null {
    return this.onboardingService.getPublicBookingPath();
  }
}
