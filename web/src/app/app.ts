import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AppConfirmDialogHostComponent } from './core/components/app-confirm-dialog-host/app-confirm-dialog-host.component';
import { AppSplashService } from './core/services/app-splash.service';

/** Rutas donde el splash de index.html evita FOUC hasta tema/shell listo (workspace + wizard de reserva). */
function urlKeepsBootSplash(url: string): boolean {
  const path = (url.split('?')[0] || '/').replace(/\/+$/, '') || '/';
  if (path === '/app' || path.startsWith('/app/')) return true;
  return /^\/[^/]+\/book\//.test(path);
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AppConfirmDialogHostComponent],
  templateUrl: './app.html',
})
export class App {
  private readonly splash = inject(AppSplashService);
  private readonly router = inject(Router);

  constructor() {
    // Failsafe: nunca dejar la app bloqueada si el theme/API falla.
    setTimeout(() => this.splash.hide(), 8000);

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (!urlKeepsBootSplash(e.urlAfterRedirects)) {
          this.splash.hide();
        }
      });
  }
}
