import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AUTH_SECOND_ATTEMPT } from '../http/auth-http-context';
import { AuthRefreshCoordinator } from '../services/auth-refresh-coordinator.service';
import { SessionService } from '../services/session.service';

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const router = inject(Router);
  const coordinator = inject(AuthRefreshCoordinator);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) {
        return throwError(() => err);
      }

      if (req.context.get(AUTH_SECOND_ATTEMPT)) {
        session.signOut();
        void router.navigateByUrl('/auth/login', { replaceUrl: true });
        return throwError(() => err);
      }

      const url = req.url;
      if (url.includes('/auth/login') || url.includes('/auth/register')) {
        session.signOut();
        void router.navigateByUrl('/auth/login', { replaceUrl: true });
        return throwError(() => err);
      }

      const rt = session.getRefreshToken();
      if (!rt) {
        session.signOut();
        void router.navigateByUrl('/auth/login', { replaceUrl: true });
        return throwError(() => err);
      }

      return from(coordinator.ensureFreshSession()).pipe(
        switchMap(() =>
          next(
            req.clone({
              context: req.context.set(AUTH_SECOND_ATTEMPT, true),
            }),
          ),
        ),
        catchError(() => {
          session.signOut();
          void router.navigateByUrl('/auth/login', { replaceUrl: true });
          return throwError(() => err);
        }),
      );
    }),
  );
};
