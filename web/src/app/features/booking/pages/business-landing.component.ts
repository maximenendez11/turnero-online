import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';
import {
  PublicBookingApiService,
  PublicBusiness,
  PublicService,
  PublicStaffMember,
} from '../services/public-booking-api.service';
import { buildBookingShellCssVars } from '../utils/booking-theme.utils';
import { formatServiceListPrice } from '../utils/price-display.utils';

@Component({
  standalone: true,
  selector: 'app-business-landing',
  imports: [CommonModule, RouterLink],
  templateUrl: './business-landing.component.html',
  styleUrls: ['./business-landing.component.scss', './business-landing-extras.scss'],
})
export class BusinessLandingComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PublicBookingApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly defaultBanner = '/images/landing-default-banner.svg';
  readonly defaultServiceImg = '/images/service-placeholder.svg';
  readonly defaultPersonImg = '/images/person-placeholder.svg';
  /** Placeholders para el skeleton de la vidriera (misma grilla que servicios reales). */
  readonly skeletonServiceSlots = [0, 1] as const;
  readonly skeletonStaffSlots = [0, 1] as const;

  tenantSlug = '';
  business: PublicBusiness | null = null;
  loading = true;
  error = false;

  constructor() {
    this.route.paramMap
      .pipe(
        map((p) => p.get('tenantSlug') ?? ''),
        distinctUntilChanged(),
        tap((slug) => {
          this.tenantSlug = slug;
          this.loading = true;
          this.error = false;
          this.business = null;
          this.cdr.markForCheck();
        }),
        switchMap((slug) => this.api.getBusiness(slug)),
        takeUntilDestroyed(),
      )
      .subscribe((b) => {
        this.loading = false;
        this.business = b;
        this.error = !b;
        this.cdr.markForCheck();
      });
  }

  shellStyles(): Record<string, string> {
    return buildBookingShellCssVars(
      this.business?.themeBackgroundHex ?? null,
      this.business?.themePrimaryHex ?? null,
    );
  }

  bannerSrc(b: PublicBusiness): string {
    const u = b.bannerImageUrl?.trim();
    return u ? u : this.defaultBanner;
  }

  serviceImage(s: PublicService): string {
    const u = s.imageUrl?.trim();
    return u ? u : this.defaultServiceImg;
  }

  staffPhoto(m: PublicStaffMember): string {
    const u = m.photoUrl?.trim();
    return u ? u : this.defaultPersonImg;
  }

  tagline(b: PublicBusiness): string {
    const d = b.description?.trim();
    if (d) return d;
    return 'Reservá tu próximo turno en segundos.';
  }

  showRating(b: PublicBusiness): boolean {
    return (b.ratingCount ?? 0) > 0 && typeof b.ratingAverage === 'number' && !Number.isNaN(b.ratingAverage);
  }

  ratingStarsFull(b: PublicBusiness): number {
    const v = b.ratingAverage ?? 0;
    return Math.min(5, Math.max(0, Math.round(v)));
  }

  ratingLabel(b: PublicBusiness): string {
    if (!this.showRating(b)) return 'Sin valoraciones todavía';
    const avg = (b.ratingAverage ?? 0).toFixed(1);
    const n = b.ratingCount ?? 0;
    return `${avg} · ${n} valoración${n === 1 ? '' : 'es'}`;
  }

  trackService(_: number, s: PublicService): string {
    return s.id;
  }

  formatPriceDisplay(svc: PublicService): string {
    return formatServiceListPrice(svc);
  }

  trackStaff(_: number, m: PublicStaffMember): string {
    return m.id;
  }

  hasSocialLinks(b: PublicBusiness): boolean {
    return !!(this.whatsappHref(b) || this.instagramHref(b) || this.facebookHref(b));
  }

  whatsappHref(b: PublicBusiness): string | null {
    const raw = b.socialWhatsappUrl?.trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    let digits = raw.replace(/\D/g, '');
    if (digits.length < 8) return null;
    if (!digits.startsWith('54') && digits.length <= 11) {
      digits = `54${digits}`;
    }
    return `https://wa.me/${digits}`;
  }

  instagramHref(b: PublicBusiness): string | null {
    const raw = b.socialInstagramUrl?.trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    const handle = raw.startsWith('@') ? raw.slice(1) : raw;
    const h = handle.replace(/^\/+|\/+$/g, '');
    if (!h) return null;
    return `https://www.instagram.com/${h}/`;
  }

  facebookHref(b: PublicBusiness): string | null {
    const raw = b.socialFacebookUrl?.trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw.replace(/^\/+/, '')}`;
  }

  reload(): void {
    if (!this.tenantSlug) return;
    this.loading = true;
    this.error = false;
    this.business = null;
    this.cdr.markForCheck();
    this.api.getBusiness(this.tenantSlug).subscribe((b) => {
      this.loading = false;
      this.business = b;
      this.error = !b;
      this.cdr.markForCheck();
    });
  }
}
