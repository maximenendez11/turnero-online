import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PublicBookingApiService } from '../services/public-booking-api.service';

type ContactChoice = 'idle' | 'email' | 'google';

@Component({
  standalone: true,
  selector: 'app-booking-confirm-contact',
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-confirm-contact.component.html',
  styleUrl: './booking-confirm-contact.component.scss',
})
export class BookingConfirmContactComponent implements AfterViewInit, OnDestroy {
  private readonly api = inject(PublicBookingApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) tenantSlug!: string;
  @Input() googleOAuthClientId: string | null = null;

  @Output() readonly verifiedChange = new EventEmitter<{ token: string; email: string } | null>();

  @ViewChild('googleBtnHost') googleBtnHost?: ElementRef<HTMLDivElement>;

  contactChoice: ContactChoice = 'idle';
  verifiedEmail: string | null = null;

  emailInput = '';
  codeInput = '';
  sendCodeLoading = false;
  sendCodeError = '';
  verifyLoading = false;
  verifyError = '';
  googleLoading = false;
  googleError = '';
  sendCooldownUntil = 0;
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  ngAfterViewInit(): void {
    if (this.contactChoice === 'google' && this.googleOAuthClientId) {
      void this.initGoogleButton();
    }
  }

  ngOnDestroy(): void {
    this.clearCooldownTimer();
    try {
      (window as unknown as { google?: { accounts?: { id?: { cancel: () => void } } } }).google?.accounts?.id?.cancel();
    } catch {
      /* noop */
    }
  }

  get hasGoogle(): boolean {
    return !!this.googleOAuthClientId?.trim();
  }

  get sendCooldownRemaining(): number {
    const left = Math.ceil((this.sendCooldownUntil - Date.now()) / 1000);
    return left > 0 ? left : 0;
  }

  pickEmail(): void {
    this.resetErrors();
    this.contactChoice = 'email';
    this.cdr.markForCheck();
  }

  pickGoogle(): void {
    this.resetErrors();
    this.contactChoice = 'google';
    this.cdr.markForCheck();
    setTimeout(() => void this.initGoogleButton(), 0);
  }

  backToChoice(): void {
    this.clearVerified();
    this.contactChoice = 'idle';
    this.emailInput = '';
    this.codeInput = '';
    this.resetErrors();
    if (this.googleBtnHost?.nativeElement) {
      this.googleBtnHost.nativeElement.innerHTML = '';
    }
    this.cdr.markForCheck();
  }

  async sendCode(): Promise<void> {
    if (this.sendCooldownRemaining > 0) return;
    this.sendCodeLoading = true;
    this.sendCodeError = '';
    this.verifyError = '';
    this.cdr.markForCheck();
    try {
      await firstValueFrom(this.api.sendBookingEmailCode(this.tenantSlug, this.emailInput.trim()));
      this.startSendCooldown(45_000);
    } catch (e) {
      this.sendCodeError = this.httpErrorMessage(e);
    } finally {
      this.sendCodeLoading = false;
      this.cdr.markForCheck();
    }
  }

  async verifyCode(): Promise<void> {
    this.verifyLoading = true;
    this.verifyError = '';
    this.cdr.markForCheck();
    try {
      const res = await firstValueFrom(
        this.api.verifyBookingEmailCode(this.tenantSlug, this.emailInput.trim(), this.codeInput.trim()),
      );
      this.applyVerified(res.bookingContactToken, res.email);
    } catch (e) {
      this.verifyError = this.httpErrorMessage(e);
    } finally {
      this.verifyLoading = false;
      this.cdr.markForCheck();
    }
  }

  private async initGoogleButton(): Promise<void> {
    const clientId = this.googleOAuthClientId?.trim();
    if (!clientId || !this.googleBtnHost?.nativeElement) return;
    this.googleLoading = true;
    this.googleError = '';
    this.cdr.markForCheck();
    try {
      await this.ensureGsiScript();
      const google = (window as unknown as {
        google?: {
          accounts: {
            id: {
              initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void }) => void;
              renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
            };
          };
        };
      }).google;
      if (!google?.accounts?.id) {
        this.googleError = 'No se pudo cargar Google. Reintentá o usá email.';
        return;
      }
      const host = this.googleBtnHost.nativeElement;
      host.innerHTML = '';
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (resp) => void this.onGoogleCredential(resp.credential),
      });
      google.accounts.id.renderButton(host, { theme: 'outline', size: 'large', width: '100%', text: 'continue_with' });
    } catch {
      this.googleError = 'No se pudo iniciar Google. Probá con email.';
    } finally {
      this.googleLoading = false;
      this.cdr.markForCheck();
    }
  }

  private async onGoogleCredential(credential: string): Promise<void> {
    this.googleError = '';
    this.verifyLoading = true;
    this.cdr.markForCheck();
    try {
      const res = await firstValueFrom(this.api.verifyGoogleBookingContact(this.tenantSlug, credential));
      this.applyVerified(res.bookingContactToken, res.email);
    } catch (e) {
      this.googleError = this.httpErrorMessage(e);
    } finally {
      this.verifyLoading = false;
      this.cdr.markForCheck();
    }
  }

  private applyVerified(token: string, email: string): void {
    this.verifiedEmail = email;
    this.verifiedChange.emit({ token, email });
    this.cdr.markForCheck();
  }

  clearVerified(): void {
    this.verifiedEmail = null;
    this.verifiedChange.emit(null);
  }

  private resetErrors(): void {
    this.sendCodeError = '';
    this.verifyError = '';
    this.googleError = '';
  }

  private startSendCooldown(ms: number): void {
    this.sendCooldownUntil = Date.now() + ms;
    this.clearCooldownTimer();
    this.cooldownTimer = setInterval(() => {
      if (this.sendCooldownUntil <= Date.now()) {
        this.clearCooldownTimer();
      }
      this.cdr.markForCheck();
    }, 500);
  }

  private clearCooldownTimer(): void {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
  }

  private ensureGsiScript(): Promise<void> {
    const w = window as unknown as { google?: { accounts?: unknown } };
    if (w.google?.accounts) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-turnero-gsi="1"]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('gsi')));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset['turneroGsi'] = '1';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('gsi'));
      document.head.appendChild(script);
    });
  }

  private httpErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: string | string[] } | null;
      const m = body?.message;
      if (Array.isArray(m)) return m.join('. ');
      if (typeof m === 'string' && m.trim()) return m;
      if (err.status === 429) return 'Demasiados intentos. Esperá un momento e intentá de nuevo.';
      if (err.status === 503) return 'El servicio no está disponible temporalmente. Probá más tarde o con otro método.';
    }
    return 'No se pudo completar la operación. Reintentá.';
  }
}
