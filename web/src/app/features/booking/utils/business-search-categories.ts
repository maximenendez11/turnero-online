import type { BusinessSearchCategoryId } from '../models/business-search.types';

export type BusinessCategoryOption = {
  id: BusinessSearchCategoryId;
  label: string;
  icon: string;
};

export const BUSINESS_SEARCH_CATEGORIES: BusinessCategoryOption[] = [
  { id: 'all', label: 'Todos', icon: 'travel_explore' },
  { id: 'peluqueria', label: 'Peluquería', icon: 'content_cut' },
  { id: 'barberia', label: 'Barbería', icon: 'face_6' },
  { id: 'estetica', label: 'Estética', icon: 'spa' },
  { id: 'spa', label: 'Spa', icon: 'hot_tub' },
  { id: 'consultorio', label: 'Consultorio', icon: 'medical_services' },
  { id: 'otro', label: 'Otros', icon: 'storefront' },
];

const LABELS = new Map(BUSINESS_SEARCH_CATEGORIES.map((c) => [c.id, c.label]));

export function businessCategoryLabel(id: string | null | undefined): string {
  if (!id?.trim()) return 'Sin categoría';
  return LABELS.get(id as BusinessSearchCategoryId) ?? id;
}
