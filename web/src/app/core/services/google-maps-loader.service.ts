import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {
  private loadPromise: Promise<void> | null = null;

  load(apiKey: string): Promise<void> {
    const key = apiKey.trim();
    if (!key) {
      return Promise.reject(new Error('Google Maps API key missing'));
    }
    if (typeof google !== 'undefined' && google.maps?.Map) {
      return Promise.resolve();
    }
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-turnero-gmaps="1"]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('gmaps')));
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;
      script.async = true;
      script.defer = true;
      script.dataset['turneroGmaps'] = '1';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('gmaps'));
      document.head.appendChild(script);
    });

    return this.loadPromise;
  }
}
