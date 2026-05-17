export type MapMarkerIconConfig = {
  url: string;
  scaledSize: google.maps.Size;
  anchor: google.maps.Point;
};

const PRIMARY = '#1a5fd4';
const PRIMARY_DARK = '#1348a8';

function svgToMarkerIcon(svg: string, size: number, anchor: number): MapMarkerIconConfig {
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(anchor, anchor),
  };
}

/** Punto de referencia de búsqueda (ubicación / Obelisco / dirección). */
export function searchCenterMarkerIcon(): MapMarkerIconConfig {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
  <circle cx="28" cy="28" r="22" fill="${PRIMARY}" opacity="0.18"/>
  <circle cx="28" cy="28" r="14" fill="${PRIMARY}" opacity="0.35"/>
  <circle cx="28" cy="28" r="9" fill="${PRIMARY_DARK}" stroke="#ffffff" stroke-width="3"/>
  <circle cx="28" cy="28" r="3.5" fill="#ffffff"/>
</svg>`.trim();
  return svgToMarkerIcon(svg, 56, 28);
}

/** Comercio en el mapa. */
export function businessMarkerIcon(selected = false): MapMarkerIconConfig {
  const fill = selected ? PRIMARY_DARK : '#ffffff';
  const stroke = selected ? '#ffffff' : PRIMARY;
  const strokeW = selected ? 3 : 2.5;
  const r = selected ? 10 : 8;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="${r + 4}" fill="${PRIMARY}" opacity="0.2"/>
  <circle cx="16" cy="16" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}"/>
</svg>`.trim();
  return svgToMarkerIcon(svg, 32, 16);
}
