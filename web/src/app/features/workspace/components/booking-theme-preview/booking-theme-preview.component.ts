import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { buildBookingShellCssVars } from '../../../booking/utils/booking-theme.utils';

@Component({
  standalone: true,
  selector: 'app-booking-theme-preview',
  imports: [CommonModule],
  templateUrl: './booking-theme-preview.component.html',
  styleUrl: './booking-theme-preview.component.scss',
})
export class BookingThemePreviewComponent {
  readonly businessName = input('');
  readonly themeBackgroundHex = input<string | null | undefined>(null);
  readonly themePrimaryHex = input<string | null | undefined>(null);

  readonly shellStyles = computed(() =>
    buildBookingShellCssVars(this.themeBackgroundHex(), this.themePrimaryHex()),
  );
}
