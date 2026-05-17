import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  PLATFORM_ID,
  effect,
  inject,
  input,
  OnDestroy,
  viewChild,
  ElementRef,
} from '@angular/core';
import { GoogleMapsLoaderService } from '../../../../core/services/google-maps-loader.service';
import type { BusinessSearchItem } from '../../models/business-search.types';
import { BusinessSearchMapService } from '../../services/business-search-map.service';
import { BusinessSearchStateService } from '../../services/business-search-state.service';

@Component({
  standalone: true,
  selector: 'app-business-search-map',
  imports: [CommonModule],
  templateUrl: './business-search-map.component.html',
  styleUrl: './business-search-map.component.scss',
  providers: [BusinessSearchMapService],
})
export class BusinessSearchMapComponent implements AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly mapsLoader = inject(GoogleMapsLoaderService);
  private readonly mapService = inject(BusinessSearchMapService);
  readonly state = inject(BusinessSearchStateService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly businesses = input<BusinessSearchItem[]>([]);
  readonly selectedId = input<string | null>(null);
  readonly mapHost = viewChild.required<ElementRef<HTMLElement>>('mapHost');

  mapReady = false;
  mapError = '';
  private viewReady = false;
  private mapInitializing = false;

  constructor() {
    effect(() => {
      const items = this.businesses();
      const selected = this.selectedId();
      const key = this.state.mapsApiKey();
      const center = this.state.searchCenter();

      if (this.viewReady && key && !this.mapReady && !this.mapInitializing) {
        void this.initMap(key);
      }

      if (this.mapReady) {
        this.mapService.syncMarkers(
          items,
          selected,
          center ? { lat: center.lat, lng: center.lng } : null,
          (id) => this.state.selectBusiness(id),
        );
        this.mapService.highlightMarker(selected);
      }
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.viewReady = true;
    const key = this.state.mapsApiKey();
    if (key) {
      void this.initMap(key);
    }
  }

  ngOnDestroy(): void {
    this.mapService.destroy();
  }

  private async initMap(apiKey: string): Promise<void> {
    if (this.mapReady || this.mapInitializing) return;
    this.mapInitializing = true;
    this.mapError = '';
    this.cdr.markForCheck();

    try {
      await this.mapsLoader.load(apiKey);
      this.mapService.initMap(this.mapHost().nativeElement);
      this.mapReady = true;
      const center = this.state.searchCenter();
      this.mapService.syncMarkers(
        this.businesses(),
        this.selectedId(),
        center ? { lat: center.lat, lng: center.lng } : null,
        (id) => this.state.selectBusiness(id),
      );
    } catch {
      this.mapError = 'No se pudo cargar el mapa. Revisá que GOOGLE_MAPS_API_KEY esté activa en el backend.';
    } finally {
      this.mapInitializing = false;
      this.cdr.markForCheck();
    }
  }
}
