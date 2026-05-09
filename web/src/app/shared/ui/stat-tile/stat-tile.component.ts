import { Component, input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-stat-tile',
  template: `
    <article class="stat-tile">
      <p class="value">{{ value() }}</p>
      <p class="label">{{ label() }}</p>
    </article>
  `,
  styles: [
    `
      .stat-tile {
        text-align: center;
      }
      .value {
        margin: 0;
        color: #adc6ff;
        font-size: clamp(1.8rem, 3.2vw, 2.25rem);
        font-weight: 700;
      }
      .label {
        color: #c2c6d6;
        text-transform: uppercase;
        font-size: 0.75rem;
        letter-spacing: 0.04em;
        margin: 0.35rem 0 0;
      }
    `,
  ],
})
export class StatTileComponent {
  value = input.required<string>();
  label = input.required<string>();
}
