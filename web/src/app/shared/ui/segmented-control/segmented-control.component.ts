import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';

export type SegmentedControlItem = {
  id: string;
  label: string;
  disabled?: boolean;
};

@Component({
  standalone: true,
  selector: 'app-segmented-control',
  imports: [CommonModule],
  template: `
    <div
      class="seg"
      [class.seg--scroll]="scrollable()"
      [class.seg--fade-left]="fadeLeft()"
      [class.seg--fade-right]="fadeRight()"
      [attr.aria-label]="ariaLabel()"
    >
      <div #list class="seg__list" role="tablist" [attr.aria-label]="ariaLabel()" (scroll)="onListScroll()">
        @for (item of items(); track item.id) {
          <button
            type="button"
            role="tab"
            class="seg__tab"
            [class.seg__tab--active]="item.id === activeId()"
            [disabled]="!!item.disabled"
            [attr.aria-selected]="item.id === activeId()"
            [attr.tabindex]="item.id === activeId() ? 0 : -1"
            [attr.data-seg-id]="item.id"
            (click)="select(item.id)"
            (keydown)="onKeydown($event, item.id)"
          >
            {{ item.label }}
          </button>
        }
      </div>
    </div>
  `,
  styleUrl: './segmented-control.component.scss',
})
export class SegmentedControlComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly items = input.required<ReadonlyArray<SegmentedControlItem>>();
  readonly activeId = input.required<string>();
  readonly ariaLabel = input<string>('Opciones');
  readonly scrollable = input(true);

  readonly change = output<string>();

  @ViewChild('list', { static: true }) private readonly list?: ElementRef<HTMLElement>;

  private readonly lastActive = signal<string | null>(null);
  protected readonly fadeLeft = signal(false);
  protected readonly fadeRight = signal(false);

  constructor() {
    effect(() => {
      const id = this.activeId();
      if (this.lastActive() === id) return;
      this.lastActive.set(id);
      queueMicrotask(() => this.scrollActiveIntoView());
    });

    effect(() => {
      if (!this.scrollable()) {
        this.fadeLeft.set(false);
        this.fadeRight.set(false);
        return;
      }
      queueMicrotask(() => this.recalcFades());
    });
  }

  select(id: string): void {
    if (id === this.activeId()) return;
    this.change.emit(id);
  }

  onKeydown(ev: KeyboardEvent, currentId: string): void {
    const key = ev.key;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') return;
    ev.preventDefault();

    const items = this.items().filter((i) => !i.disabled);
    if (items.length === 0) return;
    const idx = Math.max(0, items.findIndex((i) => i.id === currentId));

    const nextId =
      key === 'Home'
        ? items[0].id
        : key === 'End'
          ? items[items.length - 1].id
          : key === 'ArrowLeft'
            ? items[(idx - 1 + items.length) % items.length].id
            : items[(idx + 1) % items.length].id;

    this.change.emit(nextId);
    queueMicrotask(() => this.focusTab(nextId));
  }

  private focusTab(id: string): void {
    const root = this.host.nativeElement;
    const el = root.querySelector(`[data-seg-id="${CSS.escape(id)}"]`) as HTMLElement | null;
    el?.focus();
  }

  private scrollActiveIntoView(): void {
    if (!this.scrollable()) return;
    const list = this.list?.nativeElement;
    if (!list) return;
    const id = this.activeId();
    const el = list.querySelector(`[data-seg-id="${CSS.escape(id)}"]`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    this.recalcFades();
  }

  protected onListScroll(): void {
    this.recalcFades();
  }

  private recalcFades(): void {
    const list = this.list?.nativeElement;
    if (!list) return;
    if (!this.scrollable()) {
      this.fadeLeft.set(false);
      this.fadeRight.set(false);
      return;
    }
    const max = Math.max(0, list.scrollWidth - list.clientWidth);
    if (max <= 1) {
      this.fadeLeft.set(false);
      this.fadeRight.set(false);
      return;
    }
    const x = Math.max(0, Math.min(max, list.scrollLeft));
    this.fadeLeft.set(x > 1);
    this.fadeRight.set(max - x > 1);
  }
}

