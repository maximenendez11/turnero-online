import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { MyBookingRow } from '../../services/customer-bookings-api.service';

export type CustomerBookingDetail = {
  code: string;
  startsAt: string;
  durationMin?: number;
  status: string;
  customerFullName?: string | null;
  customerContact?: string | null;
  service?: { name?: string } | null;
  business?: { name?: string; slug?: string } | null;
};

@Component({
  standalone: true,
  selector: 'app-customer-booking-modal',
  imports: [CommonModule, RouterLink],
  templateUrl: './customer-booking-modal.component.html',
  styleUrl: './customer-booking-modal.component.scss',
})
export class CustomerBookingModalComponent {
  @Input({ required: true }) row!: MyBookingRow;
  @Input() detail: CustomerBookingDetail | null = null;
  @Input() loading = false;
  @Input() error = '';

  @Output() readonly closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }

  effectiveStatus(): string {
    return this.detail?.status ?? this.row.status;
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      cancelled: 'Cancelado',
    };
    return map[status] ?? status;
  }

  statusModifier(status: string): string {
    if (status === 'pending') return 'pending';
    if (status === 'cancelled') return 'cancelled';
    return 'confirmed';
  }

  businessSlug(): string | null {
    const slug = this.detail?.business?.slug?.trim() || this.row.businessSlug?.trim();
    return slug || null;
  }

  onNavigateAway(): void {
    this.closed.emit();
  }
}
