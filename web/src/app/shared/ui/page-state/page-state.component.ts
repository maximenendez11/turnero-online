import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type PageStateKind = 'loading' | 'empty' | 'error' | 'success';

@Component({
  standalone: true,
  selector: 'app-page-state',
  imports: [CommonModule, RouterLink],
  template: `
    <section class="state-card" [class]="kind()">
      <p class="badge">{{ kindLabel() }}</p>
      <h3>{{ title() }}</h3>
      <p>{{ description() }}</p>
      <a *ngIf="actionHref() && actionLabel()" [routerLink]="actionHref()">{{ actionLabel() }}</a>
    </section>
  `,
  styles: [
    `
      .state-card {
        border: 1px solid #2d2d30;
        background: rgba(30, 30, 30, 0.8);
        border-radius: 0.95rem;
        padding: 1rem;
      }
      .badge {
        margin: 0;
        text-transform: uppercase;
        font-size: 0.7rem;
        letter-spacing: 0.05em;
      }
      h3 {
        margin: 0.35rem 0 0;
      }
      p {
        color: #c2c6d6;
      }
      a {
        color: #adc6ff;
        text-decoration: none;
      }
      .loading .badge {
        color: #adc6ff;
      }
      .empty .badge {
        color: #8c909f;
      }
      .error .badge {
        color: #ffb4ab;
      }
      .success .badge {
        color: #4edea3;
      }
    `,
  ],
})
export class PageStateComponent {
  kind = input<PageStateKind>('loading');
  title = input.required<string>();
  description = input.required<string>();
  actionLabel = input<string | null>(null);
  actionHref = input<string | null>(null);

  kindLabel(): string {
    const kind = this.kind();
    if (kind === 'loading') return 'Cargando';
    if (kind === 'empty') return 'Vacio';
    if (kind === 'error') return 'Error';
    return 'Exito';
  }
}
