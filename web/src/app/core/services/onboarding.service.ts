import { Injectable, signal } from '@angular/core';

const ONBOARDING_KEY = 'zb.onboarding.complete';
const ONBOARDING_DRAFT_KEY = 'zb.onboarding.draft';

export type OnboardingDraft = {
  businessName: string;
  businessCategory: string;
  businessDescription: string;
  address: string;
  timezone: string;
  currency: string;
  whatsapp: string;
  instagram: string;
  serviceName: string;
  serviceDurationMin: number;
  servicePrice: number;
  openingHours: string;
  bookingIntervalMin: number;
  maxAppointmentsPerSlot: number;
  requiresDeposit: boolean;
  depositMode: 'none' | 'fixed' | 'percent';
  depositValue: number;
};

const DEFAULT_DRAFT: OnboardingDraft = {
  businessName: '',
  businessCategory: '',
  businessDescription: '',
  address: '',
  timezone: 'America/Argentina/Buenos_Aires',
  currency: 'ARS',
  whatsapp: '',
  instagram: '',
  serviceName: '',
  serviceDurationMin: 45,
  servicePrice: 0,
  openingHours: 'Lunes a Viernes 09:00 a 19:00',
  bookingIntervalMin: 30,
  maxAppointmentsPerSlot: 1,
  requiresDeposit: false,
  depositMode: 'none',
  depositValue: 0,
};

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly completed = signal<boolean>(this.readInitialValue());
  private readonly draft = signal<OnboardingDraft>(this.readInitialDraft());

  isCompleted(): boolean {
    return this.completed();
  }

  getDraft(): OnboardingDraft {
    return this.draft();
  }

  patchDraft(patch: Partial<OnboardingDraft>): void {
    const next = { ...this.draft(), ...patch };
    this.draft.set(next);
    localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(next));
  }

  markCompleted(): void {
    this.completed.set(true);
    localStorage.setItem(ONBOARDING_KEY, '1');
  }

  reset(): void {
    this.completed.set(false);
    this.draft.set(DEFAULT_DRAFT);
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.removeItem(ONBOARDING_DRAFT_KEY);
  }

  getPublicBookingPath(draft: OnboardingDraft = this.draft()): string | null {
    const name = draft.businessName.trim();
    if (!name) return null;
    return `/${this.slugify(name)}/book/service`;
  }

  private readInitialValue(): boolean {
    return localStorage.getItem(ONBOARDING_KEY) === '1';
  }

  private readInitialDraft(): OnboardingDraft {
    const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
    if (!raw) return DEFAULT_DRAFT;
    try {
      return { ...DEFAULT_DRAFT, ...(JSON.parse(raw) as Partial<OnboardingDraft>) };
    } catch {
      return DEFAULT_DRAFT;
    }
  }

  private slugify(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
