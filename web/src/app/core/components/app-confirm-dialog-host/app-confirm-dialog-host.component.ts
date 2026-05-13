import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { AppConfirmDialogService } from '../../services/app-confirm-dialog.service';

@Component({
  standalone: true,
  selector: 'app-confirm-dialog-host',
  imports: [CommonModule],
  templateUrl: './app-confirm-dialog-host.component.html',
  styleUrl: './app-confirm-dialog-host.component.scss',
})
export class AppConfirmDialogHostComponent {
  readonly dlg = inject(AppConfirmDialogService);

  cancel(): void {
    this.dlg.answer(false);
  }

  confirm(): void {
    this.dlg.answer(true);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.dlg.request()) this.cancel();
  }
}
