import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-section-shell',
  imports: [NgClass],
  template: '<section class="section-shell" [ngClass]="className()"><ng-content /></section>',
  styles: [
    `
      :host {
        display: block;
      }
      .section-shell {
        width: min(1120px, calc(100% - 2rem));
        margin: 0 auto;
      }
    `,
  ],
})
export class SectionShellComponent {
  className = input('');
}
