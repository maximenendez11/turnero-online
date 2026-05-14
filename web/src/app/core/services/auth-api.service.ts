import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  email: string;
  /** Mismo enum que en la API (`ADMIN` | `USER`). */
  role: 'ADMIN' | 'USER';
};

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  register(body: { email: string; password: string; recaptchaToken?: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.config.getApiUrl()}/auth/register`, body);
  }

  login(body: { email: string; password: string; recaptchaToken?: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.config.getApiUrl()}/auth/login`, body);
  }
}
