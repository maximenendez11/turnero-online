import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, shareReplay } from 'rxjs';
import { BUILD_API_URL } from '../build-config.generated';

export interface PublicConfig {
  googleMapsApiKey: string | null;
  recaptchaSiteKey: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = BUILD_API_URL;
  private googleMapsApiKey: string | null = null;
  private recaptchaSiteKey: string | null = null;
  private configLoad$: Observable<PublicConfig> | null = null;

  getApiUrl(): string {
    return (window as any).__env?.API_URL || this.apiUrl;
  }

  /** API key de Google Maps/Places. Se obtiene de window.__env o del endpoint /api/config. */
  getGoogleMapsApiKey(): string | null {
    const fromEnv = (window as any).__env?.GOOGLE_MAPS_API_KEY;
    if (fromEnv) return fromEnv;
    return this.googleMapsApiKey;
  }

  /** Site key de reCAPTCHA v3. Se obtiene de window.__env o del endpoint /api/config. */
  getRecaptchaSiteKey(): string | null {
    const fromEnv = (window as any).__env?.RECAPTCHA_SITE_KEY;
    if (fromEnv) return fromEnv;
    return this.recaptchaSiteKey;
  }

  /** Carga la config pública desde la API (incluye googleMapsApiKey del .env del backend). */
  loadPublicConfig(): Observable<PublicConfig> {
    if (this.configLoad$) return this.configLoad$;
    this.configLoad$ = this.http
      .get<PublicConfig>(`${this.getApiUrl()}/config`)
      .pipe(
        tap((c) => {
          if (c.googleMapsApiKey) this.googleMapsApiKey = c.googleMapsApiKey;
          if (c.recaptchaSiteKey) this.recaptchaSiteKey = c.recaptchaSiteKey;
        }),
        shareReplay(1)
      );
    return this.configLoad$;
  }

  /** Origen del servidor (sin /api) para Socket.IO. */
  getWsOrigin(): string {
    try {
      return new URL(this.getApiUrl()).origin;
    } catch {
      return 'http://localhost:3000';
    }
  }
}
