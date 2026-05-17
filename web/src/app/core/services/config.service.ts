import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, shareReplay } from 'rxjs';
import { BUILD_API_URL } from '../build-config.generated';

export interface PublicConfig {
  googleMapsApiKey: string | null;
  recaptchaSiteKey: string | null;
  googleOAuthClientId: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = BUILD_API_URL;
  private googleMapsApiKey: string | null = null;
  private recaptchaSiteKey: string | null = null;
  private googleOAuthClientId: string | null = null;
  private configLoad$: Observable<PublicConfig> | null = null;

  getApiUrl(): string {
    return (window as any).__env?.API_URL || this.apiUrl;
  }

  /** API key de Google Maps/Places. Se obtiene de window.__env o del endpoint /api/config. */
  getGoogleMapsApiKey(): string | null {
    const fromEnv = (window as any).__env?.GOOGLE_MAPS_API_KEY;
    const key = (typeof fromEnv === 'string' ? fromEnv : this.googleMapsApiKey)?.trim();
    return key || null;
  }

  /** Site key de reCAPTCHA v3. Se obtiene de window.__env o del endpoint /api/config. */
  getRecaptchaSiteKey(): string | null {
    const fromEnv = (window as any).__env?.RECAPTCHA_SITE_KEY;
    if (fromEnv) return fromEnv;
    return this.recaptchaSiteKey;
  }

  /** Client ID web de Google (GIS), solo para verificación de identidad en reservas. */
  getGoogleOAuthClientId(): string | null {
    const fromEnv = (window as any).__env?.GOOGLE_OAUTH_CLIENT_ID;
    if (fromEnv) return String(fromEnv);
    return this.googleOAuthClientId;
  }

  /** Carga la config pública desde la API (incluye googleMapsApiKey del .env del backend). */
  loadPublicConfig(): Observable<PublicConfig> {
    if (this.configLoad$) return this.configLoad$;
    this.configLoad$ = this.http
      .get<PublicConfig>(`${this.getApiUrl()}/config`)
      .pipe(
        tap((c) => {
          const mapsKey = c.googleMapsApiKey?.trim();
          if (mapsKey) this.googleMapsApiKey = mapsKey;
          const recaptcha = c.recaptchaSiteKey?.trim();
          if (recaptcha) this.recaptchaSiteKey = recaptcha;
          const googleClient = c.googleOAuthClientId?.trim();
          if (googleClient) this.googleOAuthClientId = googleClient;
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
