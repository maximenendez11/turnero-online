import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { AuthResponse } from './auth-api.service';
import { ConfigService } from './config.service';

/** POST /auth/refresh sin pasar por interceptores (evita dependencia circular). */
@Injectable({ providedIn: 'root' })
export class AuthRefreshClient {
  private readonly backend = inject(HttpBackend);
  private readonly config = inject(ConfigService);
  private readonly rawHttp = new HttpClient(this.backend);

  refresh(refreshToken: string): Observable<AuthResponse> {
    return this.rawHttp.post<AuthResponse>(`${this.config.getApiUrl()}/auth/refresh`, {
      refreshToken,
    });
  }
}
