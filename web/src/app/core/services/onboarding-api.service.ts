import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { OnboardingDraft } from './onboarding.service';
import { ConfigService } from './config.service';

export type OnboardingSetupResponse = {
  businessId: string;
  slug: string;
};

@Injectable({ providedIn: 'root' })
export class OnboardingApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  setup(draft: OnboardingDraft): Observable<OnboardingSetupResponse> {
    return this.http.post<OnboardingSetupResponse>(`${this.config.getApiUrl()}/onboarding/setup`, draft);
  }
}
