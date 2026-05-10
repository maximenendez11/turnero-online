import { Injectable, signal } from '@angular/core';

const TOKEN_KEY = 'zb.accessToken';
const REFRESH_KEY = 'zb.refreshToken';
const EMAIL_KEY = 'zb.userEmail';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly authenticated = signal<boolean>(this.readInitialSession());

  isAuthenticated(): boolean {
    return this.authenticated();
  }

  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  getEmail(): string | null {
    return localStorage.getItem(EMAIL_KEY);
  }

  signInWithTokens(accessToken: string, refreshToken: string, email?: string): void {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    if (email) {
      localStorage.setItem(EMAIL_KEY, email);
    }
    this.authenticated.set(true);
  }

  signOut(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(EMAIL_KEY);
    this.authenticated.set(false);
  }

  private readInitialSession(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }
}
