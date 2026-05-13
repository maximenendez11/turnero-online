import type { AdminServiceRow, AdminStaffRow } from '../../../../core/services/admin-api.service';
import { formatListPrice, parsePriceToNumber } from '../../../booking/utils/price-display.utils';

export type ServiceEditorDraft = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  price: number;
  priceOnRequest: boolean;
  depositPercent: number | null;
  modalityPresencial: boolean;
  modalityOnline: boolean;
  modalityDomicilio: boolean;
  schedulingType: AdminServiceRow['schedulingType'];
  reminderClarifications: string;
  isActive: boolean;
  imageUrl: string;
  imageUrl2: string;
  imageUrl3: string;
  staffIds: string[];
};

export function allStaffIds(staff: AdminStaffRow[]): string[] {
  return staff.map((s) => s.id);
}

export function draftFromService(s: AdminServiceRow, staff: AdminStaffRow[]): ServiceEditorDraft {
  const ids = allStaffIds(staff);
  const wild = !s.staffIds?.length;
  return {
    id: s.id,
    name: s.name,
    description: (s.description ?? '').trim(),
    durationMin: s.durationMin,
    price: Number(s.price),
    priceOnRequest: s.priceOnRequest,
    depositPercent: s.depositPercent,
    modalityPresencial: s.modalityPresencial,
    modalityOnline: s.modalityOnline,
    modalityDomicilio: s.modalityDomicilio,
    schedulingType: s.schedulingType,
    reminderClarifications: (s.reminderClarifications ?? '').trim(),
    isActive: s.isActive,
    imageUrl: (s.imageUrl ?? '').trim(),
    imageUrl2: (s.imageUrl2 ?? '').trim(),
    imageUrl3: (s.imageUrl3 ?? '').trim(),
    staffIds: wild && ids.length > 0 ? [...ids] : [...(s.staffIds ?? [])],
  };
}

export function emptyDraft(): ServiceEditorDraft {
  return {
    id: '',
    name: '',
    description: '',
    durationMin: 45,
    price: 0,
    priceOnRequest: false,
    depositPercent: null,
    modalityPresencial: true,
    modalityOnline: false,
    modalityDomicilio: false,
    schedulingType: 'regular',
    reminderClarifications: '',
    isActive: true,
    imageUrl: '',
    imageUrl2: '',
    imageUrl3: '',
    staffIds: [],
  };
}

/** Payload para API: si están todos los profesionales, enviar la lista completa (el backend guarda wildcard). */
export function staffIdsForSave(d: ServiceEditorDraft, allIds: string[]): string[] {
  if (allIds.length === 0) return [];
  const uniq = [...new Set(d.staffIds)];
  const allSelected = allIds.length > 0 && allIds.every((id) => uniq.includes(id));
  return allSelected ? [...allIds] : uniq;
}

export function listPriceLabel(price: unknown, priceOnRequest: boolean): string {
  if (priceOnRequest) return 'A definir';
  const n = Number(price);
  if (!Number.isFinite(n)) return '—';
  return formatListPrice(String(n));
}

export function depositPreviewLabel(d: ServiceEditorDraft): string | null {
  if (d.priceOnRequest) return null;
  if (d.depositPercent === null || d.depositPercent === undefined || d.depositPercent <= 0) return null;
  const base = parsePriceToNumber(String(d.price));
  if (base === null || base <= 0) return null;
  const amount = (base * d.depositPercent) / 100;
  return formatListPrice(String(amount));
}
