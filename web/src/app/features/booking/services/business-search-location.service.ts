import { Injectable } from '@angular/core';
import {
  GEOLOCATION_TIMEOUT_MS,
  OBELISCO_CENTER,
} from '../constants/business-search-location.constants';

export type SearchCenter = {
  lat: number;
  lng: number;
  label: string;
  source: 'gps' | 'obelisco' | 'address';
};

@Injectable({ providedIn: 'root' })
export class BusinessSearchLocationService {
  async resolveSearchCenter(): Promise<SearchCenter> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return this.obelisco();
    }

    try {
      const pos = await this.getCurrentPosition();
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        label: 'Tu ubicación',
        source: 'gps',
      };
    } catch {
      return this.obelisco();
    }
  }

  obelisco(): SearchCenter {
    return {
      lat: OBELISCO_CENTER.lat,
      lng: OBELISCO_CENTER.lng,
      label: 'Obelisco, CABA',
      source: 'obelisco',
    };
  }

  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: GEOLOCATION_TIMEOUT_MS,
        maximumAge: 60_000,
      });
    });
  }
}
