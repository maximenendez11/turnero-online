import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-admin-page-skeleton',
  imports: [CommonModule],
  templateUrl: './admin-page-skeleton.component.html',
  styleUrl: './admin-page-skeleton.component.scss',
})
export class AdminPageSkeletonComponent {
  readonly variant = input.required<'business' | 'bookings'>();

  protected readonly calCells = Array.from({ length: 42 }, (_, i) => i);
  protected readonly weekDays = Array.from({ length: 7 }, (_, i) => i);
  protected readonly businessTabs = Array.from({ length: 4 }, (_, i) => i);
}
