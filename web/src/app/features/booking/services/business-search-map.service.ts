import { Injectable } from '@angular/core';
import type { BusinessSearchItem } from '../models/business-search.types';
import {
  DEFAULT_MAP_CENTER,
  fitMapToBusinesses,
  hasMapCoordinates,
  latLngOf,
} from '../utils/business-search-geo.utils';
import { businessMarkerIcon, searchCenterMarkerIcon } from '../utils/map-marker-icons.utils';

type MarkerEntry = {
  marker: google.maps.Marker;
  businessId: string | 'center';
};

@Injectable()
export class BusinessSearchMapService {
  private map: google.maps.Map | null = null;
  private markers: MarkerEntry[] = [];

  initMap(container: HTMLElement): google.maps.Map {
    this.destroy();
    this.map = new google.maps.Map(container, {
      center: DEFAULT_MAP_CENTER,
      zoom: 13,
      disableDefaultUI: false,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
    });
    return this.map;
  }

  syncMarkers(
    items: BusinessSearchItem[],
    selectedId: string | null,
    center: { lat: number; lng: number } | null,
    onSelect: (id: string) => void,
  ): void {
    if (!this.map) return;
    this.clearMarkers();

    if (center) {
      const centerMarker = new google.maps.Marker({
        map: this.map,
        position: center,
        title: 'Tu zona de búsqueda',
        zIndex: 1000,
        icon: searchCenterMarkerIcon(),
      });
      this.markers.push({ marker: centerMarker, businessId: 'center' });
    }

    for (const item of items) {
      if (!hasMapCoordinates(item)) continue;
      const selected = item.id === selectedId;
      const marker = new google.maps.Marker({
        map: this.map,
        position: latLngOf(item),
        title: item.name,
        zIndex: selected ? 900 : 100,
        icon: businessMarkerIcon(selected),
      });
      marker.addListener('click', () => onSelect(item.id));
      this.markers.push({ marker, businessId: item.id });
    }

    const fitItems = items.filter(hasMapCoordinates);
    if (fitItems.length) {
      fitMapToBusinesses(this.map, fitItems, 56);
    } else if (center) {
      this.map.panTo(center);
      this.map.setZoom(13);
    }
  }

  highlightMarker(businessId: string | null): void {
    for (const { marker, businessId: id } of this.markers) {
      if (id === 'center') continue;
      const selected = id === businessId;
      marker.setZIndex(selected ? 900 : 100);
      marker.setIcon(businessMarkerIcon(selected));
    }
  }

  destroy(): void {
    this.clearMarkers();
    this.map = null;
  }

  private clearMarkers(): void {
    for (const { marker } of this.markers) {
      marker.setMap(null);
    }
    this.markers = [];
  }
}
