/** Tipos mínimos para la API de Google Maps cargada por script. */
declare namespace google.maps {
  class LatLng {
    constructor(lat: number, lng: number);
  }
  class LatLngBounds {
    extend(point: LatLng): void;
    isEmpty(): boolean;
  }
  class Size {
    constructor(width: number, height: number);
  }
  class Point {
    constructor(x: number, y: number);
  }
  interface MapOptions {
    center?: LatLngLiteral;
    zoom?: number;
    mapId?: string;
    disableDefaultUI?: boolean;
    zoomControl?: boolean;
    streetViewControl?: boolean;
    mapTypeControl?: boolean;
    fullscreenControl?: boolean;
  }
  interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  interface MarkerIcon {
    url: string;
    scaledSize?: Size;
    anchor?: Point;
  }
  class Map {
    constructor(el: HTMLElement, opts?: MapOptions);
    fitBounds(bounds: LatLngBounds, padding?: number): void;
    panTo(latLng: LatLngLiteral): void;
    setZoom(zoom: number): void;
  }
  class Marker {
    constructor(opts: {
      map?: Map;
      position?: LatLngLiteral;
      title?: string;
      icon?: string | MarkerIcon;
      zIndex?: number;
    });
    addListener(event: string, handler: () => void): void;
    setMap(map: Map | null): void;
    setZIndex(zIndex: number): void;
    setIcon(icon: string | MarkerIcon): void;
  }

  class Geocoder {
    constructor();
    geocode(
      request: { address?: string; region?: string },
      callback: (results: GeocoderResult[] | null, status: string) => void,
    ): void;
  }

  interface GeocoderResult {
    geometry: { location: { lat(): number; lng(): number } };
  }
}
