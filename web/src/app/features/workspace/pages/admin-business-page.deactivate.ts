import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { AppConfirmDialogService } from '../../../core/services/app-confirm-dialog.service';

export type AdminBusinessPageDeactivateLike = {
  openingHoursDirty(): boolean;
};

export function openingHoursUnsavedLeaveDialog() {
  return {
    title: 'Horarios sin guardar',
    message:
      'Tenés cambios en horarios sin guardar. Si salís, se perderán. ¿Seguís de todas formas?',
    cancelLabel: 'Seguir editando',
    confirmLabel: 'Salir sin guardar',
  };
}

export const adminBusinessCanDeactivate: CanDeactivateFn<AdminBusinessPageDeactivateLike> = (component) => {
  const c = component as AdminBusinessPageDeactivateLike;
  if (typeof c.openingHoursDirty !== 'function' || !c.openingHoursDirty()) {
    return true;
  }
  return inject(AppConfirmDialogService).confirm(openingHoursUnsavedLeaveDialog());
};
