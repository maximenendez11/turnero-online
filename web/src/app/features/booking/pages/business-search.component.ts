import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BusinessSearchMapComponent } from '../components/business-search-map/business-search-map.component';
import { BusinessSearchResultsComponent } from '../components/business-search-results/business-search-results.component';
import { BusinessSearchToolbarComponent } from '../components/business-search-toolbar/business-search-toolbar.component';
import { BusinessSearchStateService } from '../services/business-search-state.service';

@Component({
  standalone: true,
  selector: 'app-business-search',
  imports: [
    CommonModule,
    BusinessSearchToolbarComponent,
    BusinessSearchResultsComponent,
    BusinessSearchMapComponent,
  ],
  templateUrl: './business-search.component.html',
  styleUrl: './business-search.component.scss',
  providers: [BusinessSearchStateService],
})
export class BusinessSearchComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly state = inject(BusinessSearchStateService);

  readonly embedded = this.route.snapshot.data['embeddedInWorkspace'] === true;

  ngOnInit(): void {
    void this.state.init();
  }

  onSearch(): void {
    void this.state.search();
  }
}
