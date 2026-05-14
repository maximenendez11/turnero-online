import { Component, HostListener, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LANDING_PRICING_TIERS } from './landing-pricing.data';

@Component({
  standalone: true,
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss', './landing.tail.scss'],
})
export class LandingComponent implements OnDestroy {
  readonly menuOpen = signal(false);
  readonly staffCount = signal(1);
  readonly pricingTiers = LANDING_PRICING_TIERS;
  readonly minStaff = 1;
  readonly maxStaff = 50;

  toggleMenu(): void {
    this.menuOpen.update((open) => {
      const next = !open;
      document.body.style.overflow = next ? 'hidden' : '';
      return next;
    });
  }

  closeMenu(): void {
    document.body.style.overflow = '';
    this.menuOpen.set(false);
  }

  adjustStaff(delta: number): void {
    this.staffCount.update((n) => Math.min(this.maxStaff, Math.max(this.minStaff, n + delta)));
  }

  monthlyTotal(baseArs: number): number {
    return Math.round(baseArs * this.staffCount());
  }

  formatArs(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(value);
  }

  @HostListener('document:keydown.escape')
  onEscapeCloseMenu(): void {
    if (this.menuOpen()) {
      this.closeMenu();
    }
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }
}
