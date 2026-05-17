import type { BusinessSearchItem } from '../models/business-search.types';

const FALLBACK_BANNER = '/images/service-placeholder.svg';

export function businessBannerUrl(item: BusinessSearchItem): string {
  const url = item.bannerImageUrl?.trim();
  return url || FALLBACK_BANNER;
}

export function businessRatingLabel(item: BusinessSearchItem): string {
  const avg = item.ratingAverage;
  const count = item.ratingCount ?? 0;
  if (avg == null || count <= 0) return 'Nuevo';
  return `${avg.toFixed(1)} (${count})`;
}

export function businessShortAddress(address: string): string {
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 2) return address;
  return parts.slice(-2).join(', ');
}
