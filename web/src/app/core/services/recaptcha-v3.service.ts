import { Injectable } from '@angular/core';

/** Carga y ejecuta reCAPTCHA v3 (sin desafíos visuales). */
@Injectable({ providedIn: 'root' })
export class RecaptchaV3Service {
  private readonly loadBySiteKey = new Map<string, Promise<void>>();

  prepare(siteKey: string): Promise<void> {
    const key = siteKey.trim();
    if (!key || typeof document === 'undefined') {
      return Promise.resolve();
    }
    let p = this.loadBySiteKey.get(key);
    if (!p) {
      p = this.injectScript(key);
      this.loadBySiteKey.set(key, p);
    }
    return p;
  }

  async execute(siteKey: string, action: string): Promise<string> {
    const key = siteKey.trim();
    if (!key) {
      throw new Error('reCAPTCHA: site key vacía');
    }
    await this.prepare(key);
    const g = window.grecaptcha;
    if (!g?.execute) {
      throw new Error('reCAPTCHA no disponible');
    }
    await new Promise<void>((resolve) => {
      g.ready(() => resolve());
    });
    return g.execute(key, { action });
  }

  private injectScript(siteKey: string): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return Promise.resolve();
    }
    if (window.grecaptcha?.execute) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('recaptcha-script'));
      document.head.appendChild(s);
    });
  }
}
