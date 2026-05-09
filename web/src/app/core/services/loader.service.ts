import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoaderService {
  private loadingSignal = signal<boolean>(false);
  loading = this.loadingSignal.asReadonly();
  private refCount = 0;

  show(): void {
    this.refCount++;
    this.loadingSignal.set(true);
  }

  hide(): void {
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount === 0) {
      this.loadingSignal.set(false);
    }
  }
}
