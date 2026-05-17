import type { BusinessSearchCategoryId } from '../models/business-search.types';
import { BUSINESS_SEARCH_CATEGORIES } from './business-search-categories';

export type ParsedSearchQuery = {
  textQuery: string;
  category: BusinessSearchCategoryId;
  tryGeocodeAsAddress: boolean;
};

/** Detecta si el texto parece una dirección (número, calle, etc.). */
export function looksLikeAddressQuery(text: string): boolean {
  const q = text.trim();
  if (!q) return false;
  if (/\d{2,}/.test(q)) return true;
  return /\b(calle|av\.?|avenida|esquina|bis|barrio|cp|cpostal)\b/i.test(q);
}

export function parseSearchQuery(
  raw: string,
  activeCategory: BusinessSearchCategoryId,
): ParsedSearchQuery {
  const q = raw.trim();
  const lower = q.toLowerCase();

  for (const c of BUSINESS_SEARCH_CATEGORIES) {
    if (c.id === 'all') continue;
    if (lower === c.id || lower === c.label.toLowerCase()) {
      return { textQuery: '', category: c.id, tryGeocodeAsAddress: false };
    }
  }

  return {
    textQuery: q,
    category: activeCategory,
    tryGeocodeAsAddress: looksLikeAddressQuery(q),
  };
}
