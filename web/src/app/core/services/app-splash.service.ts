import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppSplashService {
  private readonly doc = inject(DOCUMENT);
  private hidden = false;

  hide(): void {
    if (this.hidden) return;
    this.hidden = true;
    const el = this.doc.getElementById('app-splash');
    if (!el) return;
    el.remove();
  }

  get isHidden(): boolean {
    return this.hidden || !this.doc.getElementById('app-splash');
  }
}

