import { CommonModule, DOCUMENT } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  appendWindowsForWeekdays,
  minutesToTime,
  previousWeekday,
  removeWindowsForWeekdays,
  segmentsForWeekday,
  timeToMinutes,
  validateAllWindows,
  validateSegment,
  validateSegmentsNoOverlap,
  WEEKDAY_SHORT,
  type TimeSegment,
  type WindowDraft,
} from '../../utils/opening-hours-editor.utils';

type LocalSeg = { uid: string; startMin: number; endMin: number };

function newUid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

@Component({
  standalone: true,
  selector: 'app-admin-opening-hours-editor',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-opening-hours-editor.component.html',
  styleUrl: './admin-opening-hours-editor.component.scss',
})
export class AdminOpeningHoursEditorComponent implements OnChanges {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly document = inject(DOCUMENT);

  readonly dayPills = WEEKDAY_SHORT;

  @Input({ required: true }) windows!: WindowDraft[];
  @Input() saving = false;
  @Output() readonly saveRequest = new EventEmitter<void>();

  /** Días marcados para aplicar los tramos de abajo. */
  selectedDays = new Set<number>();
  segments: LocalSeg[] = [];
  editorError: string | null = null;

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['windows'] && ch['windows'].currentValue !== ch['windows'].previousValue) {
      this.selectedDays.clear();
      this.resetSegmentsDefault();
      this.editorError = null;
      this.cdr.markForCheck();
    }
  }

  isDayOn(d: number): boolean {
    return this.selectedDays.has(d);
  }

  toggleDay(d: number): void {
    if (this.selectedDays.has(d)) this.selectedDays.delete(d);
    else this.selectedDays.add(d);
    this.editorError = null;
    this.cdr.markForCheck();
  }

  selectMonFri(): void {
    this.selectedDays.clear();
    [1, 2, 3, 4, 5].forEach((d) => this.selectedDays.add(d));
    this.editorError = null;
    this.cdr.markForCheck();
  }

  selectWholeWeek(): void {
    this.selectedDays.clear();
    for (let d = 0; d <= 6; d++) this.selectedDays.add(d);
    this.editorError = null;
    this.cdr.markForCheck();
  }

  clearDaySelection(): void {
    this.selectedDays.clear();
    this.editorError = null;
    this.cdr.markForCheck();
  }

  copyFromPreviousDay(): void {
    if (this.selectedDays.size !== 1) {
      this.editorError = 'Seleccioná un solo día para copiar el horario del día anterior.';
      return;
    }
    const [only] = [...this.selectedDays];
    const prev = previousWeekday(only);
    const src = segmentsForWeekday(this.windows, prev);
    if (src.length === 0) {
      this.editorError = `No hay horarios cargados para ${this.dayLong(prev)}.`;
      return;
    }
    this.segments = src.map((s) => ({ uid: newUid(), startMin: s.startMin, endMin: s.endMin }));
    this.editorError = null;
    this.cdr.markForCheck();
  }

  markSelectedClosed(): void {
    if (this.selectedDays.size === 0) {
      this.editorError = 'Seleccioná al menos un día para marcarlo como cerrado.';
      return;
    }
    removeWindowsForWeekdays(this.windows, [...this.selectedDays]);
    this.editorError = null;
    this.cdr.markForCheck();
  }

  addSegment(): void {
    const last = this.segments[this.segments.length - 1];
    const start = last ? Math.min(last.endMin, 24 * 60 - 60) : 9 * 60;
    const end = Math.min(start + 4 * 60, 24 * 60);
    this.segments.push({ uid: newUid(), startMin: start, endMin: Math.max(end, start + 60) });
    this.editorError = null;
    this.cdr.markForCheck();
  }

  removeSegment(i: number): void {
    this.segments.splice(i, 1);
    this.editorError = null;
    this.cdr.markForCheck();
  }

  setSegStart(seg: LocalSeg, t: string): void {
    seg.startMin = timeToMinutes(t);
    this.editorError = null;
  }

  setSegEnd(seg: LocalSeg, t: string): void {
    seg.endMin = timeToMinutes(t);
    this.editorError = null;
  }

  applySegmentsToSelection(): void {
    if (this.selectedDays.size === 0) {
      this.editorError = 'Seleccioná al menos un día antes de aplicar los tramos.';
      return;
    }
    const plain: TimeSegment[] = this.segments.map((s) => ({ startMin: s.startMin, endMin: s.endMin }));
    if (plain.length === 0) {
      this.editorError = 'Agregá al menos un tramo para aplicar. Para cerrar días usá «Marcar cerrado».';
      return;
    }
    for (const seg of plain) {
      const e = validateSegment(seg);
      if (e) {
        this.editorError = e;
        return;
      }
    }
    const ov = validateSegmentsNoOverlap(plain);
    if (ov) {
      this.editorError = ov;
      return;
    }
    removeWindowsForWeekdays(this.windows, [...this.selectedDays]);
    appendWindowsForWeekdays(this.windows, [...this.selectedDays], plain);
    this.editorError = null;
    this.cdr.markForCheck();
  }

  requestSave(): void {
    const err = validateAllWindows(this.windows);
    if (err) {
      this.editorError = err;
      this.cdr.markForCheck();
      return;
    }
    this.editorError = null;
    this.saveRequest.emit();
  }

  summaryRows(): {
    weekday: number;
    short: string;
    long: string;
    closed: boolean;
    chipLabels: string[];
  }[] {
    return WEEKDAY_SHORT.map(({ weekday, short, long }) => {
      const segs = segmentsForWeekday(this.windows, weekday);
      const closed = segs.length === 0;
      const chipLabels = closed ? [] : segs.map((s) => `${minutesToTime(s.startMin)}–${minutesToTime(s.endMin)}`);
      return { weekday, short, long, closed, chipLabels };
    });
  }

  trackSummaryDay(_: number, row: { weekday: number }): number {
    return row.weekday;
  }

  /** Día único cargado desde el resumen (coincide con pastillas activas). */
  isSummaryColumnActive(weekday: number): boolean {
    return this.selectedDays.size === 1 && this.selectedDays.has(weekday);
  }

  loadDayFromSummary(weekday: number): void {
    if (this.saving) return;
    this.selectedDays.clear();
    this.selectedDays.add(weekday);
    const segs = segmentsForWeekday(this.windows, weekday);
    if (segs.length === 0) {
      this.segments = [];
    } else {
      this.segments = segs.map((s) => ({ uid: newUid(), startMin: s.startMin, endMin: s.endMin }));
    }
    this.editorError = null;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.document.getElementById('oh-editor-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 0);
  }

  summaryAriaLabel(row: { long: string; closed: boolean; chipLabels: string[] }): string {
    if (row.closed) return `Editar ${row.long}: cerrado`;
    return `Editar ${row.long}: ${row.chipLabels.join(', ')}`;
  }

  timeStr(m: number): string {
    return minutesToTime(m);
  }

  private resetSegmentsDefault(): void {
    this.segments = [{ uid: newUid(), startMin: 9 * 60, endMin: 18 * 60 }];
  }

  private dayLong(weekday: number): string {
    return WEEKDAY_SHORT.find((d) => d.weekday === weekday)?.long ?? '';
  }

  trackSeg(_: number, s: LocalSeg): string {
    return s.uid;
  }

  trackChip(_: number, label: string): string {
    return label;
  }
}
