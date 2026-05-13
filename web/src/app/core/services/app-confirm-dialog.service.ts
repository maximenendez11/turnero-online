import { Injectable, signal } from '@angular/core';

export type AppConfirmDialogRequest = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
};

@Injectable({ providedIn: 'root' })
export class AppConfirmDialogService {
  private readonly _request = signal<AppConfirmDialogRequest | null>(null);
  private pending: { resolve: (v: boolean) => void } | null = null;

  readonly request = this._request.asReadonly();

  /**
   * Muestra el modal global y resuelve `true` si el usuario confirma la acción destructiva
   * (p. ej. salir sin guardar), o `false` si cancela.
   */
  confirm(opts: AppConfirmDialogRequest): Promise<boolean> {
    if (this.pending) {
      this.pending.resolve(false);
      this.pending = null;
    }
    return new Promise((resolve) => {
      this.pending = { resolve };
      this._request.set(opts);
    });
  }

  answer(confirmed: boolean): void {
    this._request.set(null);
    const p = this.pending;
    this.pending = null;
    p?.resolve(confirmed);
  }
}
