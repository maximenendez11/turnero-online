import { CommonModule } from '@angular/common';
import { Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { BusinessSearchCategoryId } from '../../models/business-search.types';
import { BUSINESS_SEARCH_CATEGORIES } from '../../utils/business-search-categories';
import { BusinessSearchStateService } from '../../services/business-search-state.service';

@Component({
  standalone: true,
  selector: 'app-business-search-toolbar',
  imports: [CommonModule, FormsModule],
  templateUrl: './business-search-toolbar.component.html',
  styleUrl: './business-search-toolbar.component.scss',
})
export class BusinessSearchToolbarComponent {
  readonly state = inject(BusinessSearchStateService);
  readonly categories = BUSINESS_SEARCH_CATEGORIES;
  readonly searchSubmit = output<void>();

  onCategoryClick(id: BusinessSearchCategoryId): void {
    this.state.setCategory(id);
  }

  submit(): void {
    this.searchSubmit.emit();
  }
}
