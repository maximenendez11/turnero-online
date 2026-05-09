import { Injectable, signal } from '@angular/core';

const SESSION_KEY = 'zb.session.active';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly authenticated = signal<boolean>(this.readInitialSession());

  isAuthenticated(): boolean {
    return this.authenticated();
  }

  signIn(): void {
    this.authenticated.set(true);
    localStorage.setItem(SESSION_KEY, '1');
  }

  signOut(): void {
    this.authenticated.set(false);
    localStorage.removeItem(SESSION_KEY);
  }

  private readInitialSession(): boolean {
    return localStorage.getItem(SESSION_KEY) === '1';
  }
}
