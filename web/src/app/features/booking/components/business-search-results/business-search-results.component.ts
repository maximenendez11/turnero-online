import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { BusinessSearchCardComponent } from '../business-search-card/business-search-card.component';
import { BusinessSearchStateService } from '../../services/business-search-state.service';

@Component({
  standalone: true,
  selector: 'app-business-search-results',
  imports: [CommonModule, BusinessSearchCardComponent],
  templateUrl: './business-search-results.component.html',
  styleUrl: './business-search-results.component.scss',
})
export class BusinessSearchResultsComponent {
  readonly state = inject(BusinessSearchStateService);

  onHover(id: string): void {
    this.state.selectBusiness(id);
  }
}
