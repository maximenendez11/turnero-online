import { Injectable, inject } from '@angular/core';
import { firstValueFrom, tap } from 'rxjs';
import { AuthRefreshClient } from './auth-refresh-client.service';
import { SessionService } from './session.service';

/** Una sola renovación en vuelo cuando varios requests reciben 401 a la vez. */
@Injectable({ providedIn: 'root' })
export class AuthRefreshCoordinator {
  private readonly session = inject(SessionService);
  private readonly client = inject(AuthRefreshClient);

  private refreshPromise: Promise<void> | null = null;

  async ensureFreshSession(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    const rt = this.session.getRefreshToken();
    if (!rt) {
      throw new Error('no_refresh_token');
    }
    this.refreshPromise = firstValueFrom(
      this.client.refresh(rt).pipe(
        tap((tokens) =>
          this.session.signInWithTokens(tokens.accessToken, tokens.refreshToken, tokens.email),
        ),
      ),
    )
      .then(() => undefined)
      .finally(() => {
        this.refreshPromise = null;
      });
    return this.refreshPromise;
  }
}
