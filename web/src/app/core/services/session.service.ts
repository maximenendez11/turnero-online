import { Injectable, signal } from '@angular/core';

const TOKEN_KEY = 'zb.accessToken';
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

  getEmail(): string | null {
    return localStorage.getItem(EMAIL_KEY);
  }

  signInWithToken(accessToken: string, email?: string): void {
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (email) {
      localStorage.setItem(EMAIL_KEY, email);
    }
    this.authenticated.set(true);
  }

  signOut(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    this.authenticated.set(false);
  }

  private readInitialSession(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }
}
