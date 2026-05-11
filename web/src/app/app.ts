import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppSplashService } from './core/services/app-splash.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  private readonly splash = inject(AppSplashService);

  constructor() {
    // Failsafe: nunca dejar la app bloqueada si el theme/API falla.
    setTimeout(() => this.splash.hide(), 8000);
  }
}
