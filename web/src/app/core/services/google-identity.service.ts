import { Injectable } from '@angular/core';

type GsiId = {
  initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void }) => void;
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
  cancel: () => void;
};

@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  ensureScript(): Promise<void> {
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

  async renderSignInButton(
    host: HTMLElement,
    clientId: string,
    onCredential: (credential: string) => void,
  ): Promise<void> {
    await this.ensureScript();
    const google = (window as unknown as { google?: { accounts?: { id?: GsiId } } }).google;
    const id = google?.accounts?.id;
    if (!id) throw new Error('gsi-unavailable');
    host.innerHTML = '';
    id.initialize({
      client_id: clientId,
      callback: (resp) => onCredential(resp.credential),
    });
    id.renderButton(host, {
      theme: 'outline',
      size: 'large',
      width: '100%',
      text: 'continue_with',
      locale: 'es',
    });
  }

  cancel(): void {
    const id = (window as unknown as { google?: { accounts?: { id?: GsiId } } }).google?.accounts?.id;
    id?.cancel();
  }
}
