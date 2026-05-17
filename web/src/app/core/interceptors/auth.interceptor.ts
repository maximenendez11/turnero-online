import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap } from 'rxjs';
import { AuthRefreshCoordinator } from '../services/auth-refresh-coordinator.service';
import { SessionService } from '../services/session.service';

// Ajustable: refrescar si faltan <= N segundos para expirar.
const REFRESH_THRESHOLD_SECONDS = 90;

function readJwtExpSeconds(accessToken: string): number | null {
  // JWT: header.payload.signature → payload es base64url JSON con `exp` en segundos.
  const parts = accessToken.split('.');
  if (parts.length < 2) return null;
  const payload = parts[1];
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  try {
    const json = atob(base64 + pad);
    const parsed = JSON.parse(json) as { exp?: unknown };
    return typeof parsed.exp === 'number' ? parsed.exp : null;
  } catch {
    return null;
  }
}

function shouldRefreshSoon(accessToken: string, nowMs: number): boolean {
  const expSeconds = readJwtExpSeconds(accessToken);
  if (!expSeconds) return false;
  const expMs = expSeconds * 1000;
  return expMs - nowMs <= REFRESH_THRESHOLD_SECONDS * 1000;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const coordinator = inject(AuthRefreshCoordinator);
  const token = session.getAccessToken();
  if (!token) {
    return next(req);
  }
  const url = req.url;
  if (
    url.includes('/auth/login') ||
    url.includes('/auth/google') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh')
  ) {
    return next(req);
  }

  // Refresh proactivo solo cuando el token está por vencer y hay refresh token disponible.
  const nowMs = Date.now();
  const hasRt = !!session.getRefreshToken();
  if (hasRt && shouldRefreshSoon(token, nowMs)) {
    return from(coordinator.ensureFreshSession()).pipe(
      switchMap(() => {
        const fresh = session.getAccessToken() ?? token;
        return next(req.clone({ setHeaders: { Authorization: `Bearer ${fresh}` } }));
      }),
      // Si el refresh falla, seguimos con el token actual; el 401 reactivo lo resolverá.
      catchError(() => next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }))),
    );
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
