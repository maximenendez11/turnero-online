export type BusinessSearchItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
  ratingAverage: number | null;
  ratingCount: number;
  bannerImageUrl: string | null;
  distanceKm?: number | null;
};

export type BusinessSearchCategoryId =
  | 'all'
  | 'peluqueria'
  | 'barberia'
  | 'estetica'
  | 'spa'
  | 'consultorio'
  | 'otro';
