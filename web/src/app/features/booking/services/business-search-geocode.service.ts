import { Injectable } from '@angular/core';
import { GoogleMapsLoaderService } from '../../../core/services/google-maps-loader.service';
import type { BusinessSearchItem } from '../models/business-search.types';
import { haversineKm, hasMapCoordinates } from '../utils/business-search-geo.utils';

@Injectable({ providedIn: 'root' })
export class BusinessSearchGeocodeService {
  private geocoder: google.maps.Geocoder | null = null;

  constructor(private readonly mapsLoader: GoogleMapsLoaderService) {}

  async geocodeText(apiKey: string, address: string): Promise<{ lat: number; lng: number } | null> {
    const q = address.trim();
    if (!q) return null;
    await this.mapsLoader.load(apiKey);
    const geocoder = await this.getGeocoder();
    return new Promise((resolve) => {
      geocoder.geocode({ address: `${q}, Argentina`, region: 'AR' }, (results, status) => {
        if (status !== 'OK' || !results?.[0]?.geometry?.location) {
          resolve(null);
          return;
        }
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng() });
      });
    });
  }

  /** Completa lat/lng de comercios que solo tienen dirección (para marcadores en el mapa). */
  async enrichMissingCoordinates(
    apiKey: string,
    items: BusinessSearchItem[],
    max = 12,
  ): Promise<BusinessSearchItem[]> {
    await this.mapsLoader.load(apiKey);
    const geocoder = await this.getGeocoder();
    const out: BusinessSearchItem[] = [];
    let done = 0;

    for (const item of items) {
      if (hasMapCoordinates(item) || done >= max) {
        out.push(item);
        continue;
      }
      const addr = item.address?.trim();
      if (!addr) {
        out.push(item);
        continue;
      }
      const coords = await this.geocodeWithGeocoder(geocoder, addr);
      done += 1;
      out.push(
        coords
          ? { ...item, latitude: coords.lat, longitude: coords.lng }
          : item,
      );
    }
    return out;
  }

  filterWithinRadius(
    items: BusinessSearchItem[],
    centerLat: number,
    centerLng: number,
    radiusKm: number,
  ): BusinessSearchItem[] {
    return items.filter((item) => {
      if (!hasMapCoordinates(item)) return true;
      const d = haversineKm(centerLat, centerLng, item.latitude as number, item.longitude as number);
      return d <= radiusKm;
    });
  }

  private async getGeocoder(): Promise<google.maps.Geocoder> {
    if (this.geocoder) return this.geocoder;
    this.geocoder = new google.maps.Geocoder();
    return this.geocoder;
  }

  private geocodeWithGeocoder(
    geocoder: google.maps.Geocoder,
    address: string,
  ): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      geocoder.geocode({ address: `${address}, Argentina`, region: 'AR' }, (results, status) => {
        if (status !== 'OK' || !results?.[0]?.geometry?.location) {
          resolve(null);
          return;
        }
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng() });
      });
    });
  }
}
