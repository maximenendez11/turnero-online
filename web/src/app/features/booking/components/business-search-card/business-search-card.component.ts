import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { BusinessSearchItem } from '../../models/business-search.types';
import { businessCategoryLabel } from '../../utils/business-search-categories';
import {
  businessBannerUrl,
  businessRatingLabel,
  businessShortAddress,
} from '../../utils/business-search-display.utils';

@Component({
  standalone: true,
  selector: 'app-business-search-card',
  imports: [CommonModule, RouterLink],
  templateUrl: './business-search-card.component.html',
  styleUrl: './business-search-card.component.scss',
})
export class BusinessSearchCardComponent {
  readonly business = input.required<BusinessSearchItem>();
  readonly selected = input(false);
  readonly hovered = output<void>();

  categoryLabel(cat: string | null): string {
    return businessCategoryLabel(cat);
  }

  banner(item: BusinessSearchItem): string {
    return businessBannerUrl(item);
  }

  rating(item: BusinessSearchItem): string {
    return businessRatingLabel(item);
  }

  shortAddress(address: string): string {
    return businessShortAddress(address);
  }
}
