import { Component, input } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-button',
  imports: [NgIf],
  template: `
    <a *ngIf="href(); else buttonTpl" [href]="href() || '#'" class="btn" [class]="variantClass()">
      <ng-content />
    </a>
    <ng-template #buttonTpl>
      <button type="button" class="btn" [class]="variantClass()">
        <ng-content />
      </button>
    </ng-template>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }
      .btn {
        border: 1px solid transparent;
        padding: 0.85rem 1.25rem;
        border-radius: 0.8rem;
        font-weight: 700;
        text-decoration: none;
        cursor: pointer;
        transition: transform 0.2s ease, background 0.2s ease;
        display: inline-flex;
        justify-content: center;
        align-items: center;
        gap: 0.4rem;
      }
      .btn:active {
        transform: scale(0.98);
      }
      .btn-primary {
        background: #1a5fd4;
        color: #ffffff;
        box-shadow: 0 4px 18px rgba(26, 95, 212, 0.22);
      }
      .btn-glass {
        background: rgba(255, 255, 255, 0.86);
        border-color: #c8ccd8;
        color: #1a1b1f;
      }
      .btn-full {
        width: 100%;
      }
    `,
  ],
})
export class AppButtonComponent {
  href = input<string | null>(null);
  variant = input<'primary' | 'glass'>('primary');
  fullWidth = input(false);

  variantClass(): string {
    const variant = this.variant() === 'glass' ? 'btn-glass' : 'btn-primary';
    return this.fullWidth() ? `${variant} btn-full` : variant;
  }
}
