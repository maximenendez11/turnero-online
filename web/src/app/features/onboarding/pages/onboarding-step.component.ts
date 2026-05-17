import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { OnboardingApiService } from '../../../core/services/onboarding-api.service';
import { OnboardingDraft, OnboardingService } from '../../../core/services/onboarding.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';

export type OnboardingStepData = {
  stepId: string;
  step: number;
  total: number;
  title: string;
  description: string;
  prev?: string | null;
  next?: string;
  finish?: boolean;
};

@Component({
  standalone: true,
  selector: 'app-onboarding-step',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './onboarding-step.component.html',
  styleUrl: './onboarding-step.component.scss',
})
export class OnboardingStepComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly onboardingService = inject(OnboardingService);
  private readonly onboardingApi = inject(OnboardingApiService);
  private readonly adminApi = inject(AdminApiService);

  readonly data = this.route.snapshot.data as OnboardingStepData;
  readonly stepId = this.data.stepId;
  readonly finishStep = !!this.data.finish;
  readonly setupError = signal<string | null>(null);
  readonly submitting = signal(false);
  draft: OnboardingDraft = { ...this.onboardingService.getDraft() };

  get bookingLink(): string | null {
    return this.onboardingService.getPublicBookingPath(this.draft);
  }

  async continue(): Promise<void> {
    if (!this.data.next) return;

    this.onboardingService.patchDraft(this.draft);

    if (this.finishStep) {
      this.setupError.set(null);
      this.submitting.set(true);
      try {
        await firstValueFrom(this.onboardingApi.setup(this.draft));
        this.adminApi.invalidateBusinessesList();
        this.onboardingService.markCompleted();
      } catch (err) {
        this.setupError.set(apiErrorMessage(err));
        this.submitting.set(false);
        return;
      }
      this.submitting.set(false);
    }

    await this.router.navigateByUrl(this.data.next);
  }
}
