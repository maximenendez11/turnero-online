import type { BusinessSearchItem } from '../models/business-search.types';
import type { PublicBusinessListItem } from '../services/public-booking-api.service';

export function mapToBusinessSearchItem(raw: PublicBusinessListItem): BusinessSearchItem {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    description: raw.description ?? null,
    address: raw.address,
    category: raw.category ?? null,
    latitude: typeof raw.latitude === 'number' ? raw.latitude : null,
    longitude: typeof raw.longitude === 'number' ? raw.longitude : null,
    ratingAverage: typeof raw.ratingAverage === 'number' ? raw.ratingAverage : null,
    ratingCount: typeof raw.ratingCount === 'number' ? raw.ratingCount : 0,
    bannerImageUrl: raw.bannerImageUrl ?? null,
    distanceKm: typeof raw.distanceKm === 'number' ? raw.distanceKm : null,
  };
}
