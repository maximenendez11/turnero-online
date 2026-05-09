import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-glass-card',
  imports: [NgClass],
  template: '<div class="glass-card" [ngClass]="className()"><ng-content /></div>',
  styles: [
    `
      :host {
        display: block;
      }
      .glass-card {
        background: rgba(30, 30, 30, 0.8);
        backdrop-filter: blur(12px);
        border: 1px solid #2d2d30;
        border-radius: 1rem;
      }
    `,
  ],
})
export class GlassCardComponent {
  className = input('');
}
