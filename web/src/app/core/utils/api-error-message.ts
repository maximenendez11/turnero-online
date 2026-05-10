import { HttpErrorResponse } from '@angular/common/http';

/** Mensaje legible desde respuestas Nest (`{ message }`) o fallo de red. */
export function apiErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error;
    if (body && typeof body === 'object' && 'message' in body) {
      const m = (body as { message: unknown }).message;
      if (Array.isArray(m)) {
        return m.join(', ');
      }
      if (typeof m === 'string') {
        return m;
      }
    }
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor. ¿Está la API en marcha?';
    }
    return err.message || `Error HTTP ${err.status}`;
  }
  return 'Error inesperado';
}
