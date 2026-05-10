import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionService } from '../services/session.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const token = session.getAccessToken();
  if (!token) {
    return next(req);
  }
  const url = req.url;
  if (url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh')) {
    return next(req);
  }
  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
