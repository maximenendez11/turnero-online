import { Component } from '@angular/core';
import { LandingComponent } from '../marketing/pages/landing/landing.component';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [LandingComponent],
  template: '<app-landing />',
})
export class HomeComponent {}

