import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { OnboardingDraft } from './onboarding.service';
import { ConfigService } from './config.service';

export type OnboardingSetupResponse = {
  businessId: string;
  slug: string;
};

/** Cuerpo alineado con `OnboardingSetupDto` (ValidationPipe forbidNonWhitelisted). */
export type OnboardingSetupBody = {
  businessName: string;
  businessCategory?: string;
  businessDescription?: string;
  address: string;
  timezone: string;
  serviceName: string;
  serviceDurationMin: number;
  servicePrice: number;
  bookingIntervalMin: number;
};

@Injectable({ providedIn: 'root' })
export class OnboardingApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  setup(draft: OnboardingDraft): Observable<OnboardingSetupResponse> {
    const body: OnboardingSetupBody = {
      businessName: draft.businessName.trim(),
      address: draft.address.trim(),
      timezone: draft.timezone.trim(),
      serviceName: draft.serviceName.trim(),
      serviceDurationMin: Number(draft.serviceDurationMin),
      servicePrice: Number(draft.servicePrice),
      bookingIntervalMin: Number(draft.bookingIntervalMin),
    };
    const cat = draft.businessCategory?.trim();
    if (cat) body.businessCategory = cat;
    const desc = draft.businessDescription?.trim();
    if (desc) body.businessDescription = desc;
    return this.http.post<OnboardingSetupResponse>(`${this.config.getApiUrl()}/onboarding/setup`, body);
  }
}
