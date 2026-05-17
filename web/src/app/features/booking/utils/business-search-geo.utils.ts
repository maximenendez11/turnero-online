import type { BusinessSearchItem } from '../models/business-search.types';
import { OBELISCO_CENTER } from '../constants/business-search-location.constants';

export const DEFAULT_MAP_CENTER = OBELISCO_CENTER;

/** Distancia en km (Haversine). */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function hasMapCoordinates(item: BusinessSearchItem): boolean {
  return (
    typeof item.latitude === 'number' &&
    typeof item.longitude === 'number' &&
    Number.isFinite(item.latitude) &&
    Number.isFinite(item.longitude)
  );
}

export function mappableBusinesses(items: BusinessSearchItem[]): BusinessSearchItem[] {
  return items.filter(hasMapCoordinates);
}

export function latLngOf(item: BusinessSearchItem): google.maps.LatLngLiteral {
  return { lat: item.latitude as number, lng: item.longitude as number };
}

export function fitMapToBusinesses(
  map: google.maps.Map,
  items: BusinessSearchItem[],
  padding = 48,
): void {
  const mappable = mappableBusinesses(items);
  if (!mappable.length) {
    map.panTo(DEFAULT_MAP_CENTER);
    map.setZoom(11);
    return;
  }
  if (mappable.length === 1) {
    map.panTo(latLngOf(mappable[0]));
    map.setZoom(14);
    return;
  }
  const bounds = new google.maps.LatLngBounds();
  for (const b of mappable) {
    bounds.extend(new google.maps.LatLng(latLngOf(b).lat, latLngOf(b).lng));
  }
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, padding);
  }
}
