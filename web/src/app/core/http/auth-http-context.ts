import { HttpContextToken } from '@angular/common/http';

/** Si es true, un 401 no intenta refresh (evita bucles tras reintentar el mismo request). */
export const AUTH_SECOND_ATTEMPT = new HttpContextToken<boolean>(() => false);
