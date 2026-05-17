import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { DEFAULT_SEARCH_RADIUS_KM } from '../constants/business-search-location.constants';
import type { BusinessSearchCategoryId, BusinessSearchItem } from '../models/business-search.types';
import { parseSearchQuery } from '../utils/business-search-query.utils';
import { haversineKm } from '../utils/business-search-geo.utils';
import { mapToBusinessSearchItem } from '../utils/business-search.mapper';
import type { SearchCenter } from './business-search-location.service';
import { BusinessSearchGeocodeService } from './business-search-geocode.service';
import { BusinessSearchLocationService } from './business-search-location.service';
import { PublicBookingApiService } from './public-booking-api.service';

@Injectable()
export class BusinessSearchStateService {
  private readonly api = inject(PublicBookingApiService);
  private readonly config = inject(ConfigService);
  private readonly location = inject(BusinessSearchLocationService);
  private readonly geocode = inject(BusinessSearchGeocodeService);

  readonly query = signal('');
  readonly category = signal<BusinessSearchCategoryId>('all');
  readonly results = signal<BusinessSearchItem[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly hasSearched = signal(false);
  readonly mapsApiKey = signal<string | null>(null);
  readonly searchCenter = signal<SearchCenter | null>(null);
  readonly radiusKm = signal(DEFAULT_SEARCH_RADIUS_KM);

  readonly selectedBusiness = computed(() => {
    const id = this.selectedId();
    return this.results().find((b) => b.id === id) ?? null;
  });

  readonly resultCountLabel = computed(() => {
    const n = this.results().length;
    const center = this.searchCenter();
    if (this.loading()) return 'Buscando…';
    if (!this.hasSearched()) return '';
    const zone = center ? ` · ${DEFAULT_SEARCH_RADIUS_KM} km desde ${center.label}` : '';
    return n === 1 ? `1 comercio${zone}` : `${n} comercios${zone}`;
  });

  async init(): Promise<void> {
    await this.initMapsConfig();
    const center = await this.location.resolveSearchCenter();
    this.searchCenter.set(center);
    await this.search();
  }

  async initMapsConfig(): Promise<void> {
    try {
      await firstValueFrom(this.config.loadPublicConfig());
    } catch {
      /* noop */
    }
    const key = this.config.getGoogleMapsApiKey()?.trim() || null;
    this.mapsApiKey.set(key);
  }

  selectBusiness(id: string | null): void {
    this.selectedId.set(id);
  }

  setCategory(category: BusinessSearchCategoryId): void {
    this.category.set(category);
    if (this.hasSearched()) {
      void this.search();
    }
  }

  async search(): Promise<void> {
    const center = this.searchCenter() ?? this.location.obelisco();
    const apiKey = this.mapsApiKey();
    const parsed = parseSearchQuery(this.query(), this.category());
    let searchLat = center.lat;
    let searchLng = center.lng;

    this.loading.set(true);
    this.error.set('');
    this.hasSearched.set(true);

    try {
      if (parsed.tryGeocodeAsAddress && apiKey && parsed.textQuery) {
        const geo = await this.geocode.geocodeText(apiKey, parsed.textQuery);
        if (geo) {
          searchLat = geo.lat;
          searchLng = geo.lng;
          this.searchCenter.set({
            lat: geo.lat,
            lng: geo.lng,
            label: parsed.textQuery,
            source: 'address',
          });
        }
      }

      const raw = await firstValueFrom(
        this.api.searchBusinesses({
          query: parsed.textQuery,
          category: parsed.category,
          lat: searchLat,
          lng: searchLng,
          radiusKm: this.radiusKm(),
        }),
      );

      let items = raw.map(mapToBusinessSearchItem);

      if (apiKey) {
        items = await this.geocode.enrichMissingCoordinates(apiKey, items);
        items = this.geocode.filterWithinRadius(items, searchLat, searchLng, this.radiusKm());
        items = items
          .map((item) => ({
            ...item,
            distanceKm:
              item.distanceKm ??
              (item.latitude != null && item.longitude != null
                ? this.distanceFrom(searchLat, searchLng, item.latitude, item.longitude)
                : null),
          }))
          .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
      }

      this.results.set(items);
      const first = items[0]?.id ?? null;
      this.selectedId.set(
        this.selectedId() && items.some((b) => b.id === this.selectedId()) ? this.selectedId() : first,
      );
    } catch {
      this.results.set([]);
      this.selectedId.set(null);
      this.error.set('No se pudo buscar. Reintentá en unos segundos.');
    } finally {
      this.loading.set(false);
    }
  }

  private distanceFrom(lat1: number, lng1: number, lat2: number, lng2: number): number {
    return haversineKm(lat1, lng1, lat2, lng2);
  }
}
