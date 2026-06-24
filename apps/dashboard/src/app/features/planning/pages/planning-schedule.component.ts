import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/i18n/language.service';
import { PlanningService } from '../data-access/planning.service';
import { ProductionSlot } from '../models/planning.model';
import { PLANNING_MACHINES, PLANNING_MACHINE_LABELS } from '../data/planning-mock.data';

const LINE_CSS: Record<string, string> = { AV: 'line-av', ND: 'line-nd', GV: 'line-gv' };
const SLOT_CSS: Record<string, string> = {
  planned: 'slot-planned', 'in-progress': 'slot-inprog', done: 'slot-done', delayed: 'slot-delayed',
};

@Component({
  selector: 'app-planning-schedule',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="sched-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h3>{{ isVi ? 'Lịch Sản Xuất' : '生產排程' }}</h3>
          <p>{{ isVi ? 'Gantt chart – AV / ND / GV tổng hợp' : '甘特圖 – AV / ND / GV 整合' }}</p>
        </div>
        <div class="nav-buttons">
          <button class="nav-btn" (click)="startOffset.set(startOffset() - 7)">‹</button>
          <button class="nav-btn today-btn" (click)="startOffset.set(-2)">📅 {{ isVi ? 'Hôm nay' : '今天' }}</button>
          <button class="nav-btn" (click)="startOffset.set(startOffset() + 7)">›</button>
        </div>
      </div>

      <!-- Summary -->
      <div class="summary-grid">
        @for (s of summaryCards; track s.label) {
          <div class="sum-card">
            <div class="sum-val" [class]="s.color">{{ s.value }}</div>
            <div class="sum-label">{{ s.label }}</div>
          </div>
        }
      </div>

      <!-- Legend -->
      <div class="legend-row">
        @for (l of statusLegend; track l.label) {
          <div class="legend-item"><div class="legend-dot" [class]="l.css"></div>{{ l.label }}</div>
        }
        <div class="legend-sep"></div>
        @for (line of ['AV', 'ND', 'GV']; track line) {
          <div class="legend-item"><div class="line-dot" [class]="LINE_CSS[line]"></div>{{ line }}</div>
        }
      </div>

      <!-- Gantt Table -->
      <div class="gantt-card">
        <div class="table-scroll">
          <table class="gantt-table">
            <thead>
              <tr>
                <th class="machine-col">{{ isVi ? 'Máy / Dây chuyền' : '機台 / 產線' }}</th>
                @for (day of days(); track day.date) {
                  <th colspan="2" [class.today-col]="day.isToday">
                    {{ day.display }}
                    @if (day.isToday) { <span class="today-badge">{{ isVi ? 'Hôm nay' : '今天' }}</span> }
                  </th>
                }
              </tr>
              <tr class="shift-row">
                <th class="machine-col"></th>
                @for (day of days(); track day.date) {
                  <th class="shift-th" [class.today-col]="day.isToday">{{ t('day') }}</th>
                  <th class="shift-th" [class.today-col]="day.isToday">{{ t('night') }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (machine of machines; track machine) {
                <tr>
                  <td class="machine-td">
                    <div class="machine-name">{{ machine }}</div>
                    <div class="machine-sub">{{ isVi ? machineLabels[machine].vi : machineLabels[machine].zh }}</div>
                  </td>
                  @for (day of days(); track day.date) {
                    @for (shift of ['day', 'night']; track shift) {
                      <td class="slot-td" [class.today-bg]="day.isToday">
                        @let slot = getSlot(day.date, machine, shift);
                        @if (slot) {
                          <div class="slot-block" [class]="SLOT_CSS[slot.status]">
                            <div class="slot-top">
                              <div class="line-dot sm" [class]="LINE_CSS[slot.productLine]"></div>
                              <span class="slot-line">{{ slot.productLine }}</span>
                            </div>
                            <div class="slot-prod" [title]="slot.productName">{{ slot.productName.split(' ').slice(-2).join(' ') }}</div>
                            <div class="slot-qty">
                              @if (slot.actualQty !== null) { ✓ {{ slot.actualQty.toLocaleString() }} }
                              @else { {{ slot.plannedQty.toLocaleString() }} }
                              kg
                            </div>
                            @if (slot.actualQty !== null) {
                              <div class="slot-plan">{{ isVi ? 'kh:' : '計:' }}{{ slot.plannedQty.toLocaleString() }}</div>
                            }
                          </div>
                        } @else {
                          <div class="slot-empty"></div>
                        }
                      </td>
                    }
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Nata Backward Scheduler -->
      <div class="nata-card">
        <h4>🌿 {{ isVi ? 'Kế Hoạch Nata – Backward Scheduling' : '椰果計劃 – 反向排程' }}</h4>
        <p>{{ isVi ? 'Nhập ngày SX thành phẩm → hệ thống tự tính ngày cấy, thu hoạch, gia nhiệt, cắt' : '輸入成品生產日 → 系統自動計算接種、採收、加熱、切割日期' }}</p>

        <div class="nata-inputs">
          <div class="input-group">
            <label>{{ isVi ? 'Ngày SX thành phẩm ND:' : 'ND成品預計生產日:' }}</label>
            <input type="date" [(ngModel)]="targetDate" class="date-input" />
          </div>
          <div class="input-group">
            <label>{{ isVi ? 'Số ngày nuôi:' : '培養天數:' }}</label>
            <select [(ngModel)]="nuoiDays" class="sel">
              @for (n of [14,15,16,17,18,19,20,21]; track n) {
                <option [value]="n">{{ n }} {{ isVi ? 'ngày' : '天' }}</option>
              }
            </select>
          </div>
        </div>

        @if (isPast()) {
          <div class="warn-box">
            ⚠️ {{ isVi
              ? 'Ngày cấy cần là ' + fmtDate(nataSteps()[0].date) + ' – đã qua! Không thể kịp cho ngày SX đã chọn.'
              : '需接種日 ' + fmtDate(nataSteps()[0].date) + ' 已過！無法趕上所選生產日期。' }}
          </div>
        }

        <div class="nata-timeline">
          @for (step of nataSteps(); track step.label; let i = $index) {
            <div class="nata-step">
              <div class="step-circle" [class]="step.color">{{ i + 1 }}</div>
              <div class="step-label">{{ step.label }}</div>
              <div class="step-date" [class.past]="!step.isRange && isPastDate(step.date)">
                {{ step.isRange ? step.date : fmtDate(step.date) }}
              </div>
            </div>
            @if (i < nataSteps().length - 1) { <div class="step-arrow">→</div> }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .sched-page { display: flex; flex-direction: column; gap: 16px; }
    .page-header { align-items: center; display: flex; justify-content: space-between; }
    h3 { color: var(--shell-text, #17233b); font-size: 1.1rem; font-weight: 700; margin: 0; }
    .page-header p { color: var(--muted, #6b7280); font-size: .78rem; margin: 3px 0 0; }
    .nav-buttons { display: flex; gap: 6px; }
    .nav-btn { background: var(--card-bg, #fff); border: 1px solid var(--card-border, #e2e8f0); border-radius: 8px; color: var(--shell-text, #374151); cursor: pointer; font-size: .82rem; padding: 6px 12px; }
    .nav-btn:hover { background: var(--row-hover, #f1f5f9); }
    .today-btn { display: flex; align-items: center; gap: 4px; }
    .summary-grid { display: grid; gap: 10px; grid-template-columns: repeat(4, 1fr); }
    @media (max-width: 600px) { .summary-grid { grid-template-columns: repeat(2, 1fr); } }
    .sum-card { background: var(--card-bg, #fff); border: 1px solid var(--card-border, #e2e8f0); border-radius: 10px; padding: 12px; }
    .sum-val { font-size: 1.1rem; font-weight: 700; color: var(--shell-text, #1e293b); }
    .sum-val.blue { color: #2563eb; } .sum-val.green { color: #16a34a; } .sum-val.yellow { color: #ca8a04; }
    .sum-label { color: var(--muted, #6b7280); font-size: .71rem; margin-top: 4px; }
    .legend-row { align-items: center; display: flex; flex-wrap: wrap; gap: 10px; }
    .legend-item { align-items: center; display: flex; font-size: .72rem; gap: 5px; color: var(--muted, #64748b); }
    .legend-dot { border: 1px solid; border-radius: 3px; height: 10px; width: 10px; }
    .slot-planned { background: #dbeafe; border-color: #60a5fa; } .slot-planned .legend-dot { background: #dbeafe; border-color: #60a5fa; }
    .slot-inprog  { background: #fef9c3; border-color: #facc15; } .slot-inprog .legend-dot  { background: #fef9c3; border-color: #facc15; }
    .slot-done    { background: #dcfce7; border-color: #4ade80; } .slot-done .legend-dot    { background: #dcfce7; border-color: #4ade80; }
    .slot-delayed { background: #fee2e2; border-color: #f87171; } .slot-delayed .legend-dot { background: #fee2e2; border-color: #f87171; }
    .legend-sep { width: 16px; }
    .line-dot { border-radius: 50%; height: 8px; width: 8px; flex-shrink: 0; }
    .line-dot.sm { height: 6px; width: 6px; }
    .line-av { background: #22c55e; } .line-nd { background: #3b82f6; } .line-gv { background: #f97316; }

    .gantt-card { background: var(--card-bg, #fff); border: 1px solid var(--card-border, #e2e8f0); border-radius: 12px; overflow: hidden; }
    .table-scroll { overflow-x: auto; }
    .gantt-table { border-collapse: collapse; font-size: .75rem; min-width: 900px; width: 100%; }
    .gantt-table th { background: var(--th-bg, #f8fafc); border-bottom: 1px solid var(--card-border, #e2e8f0); color: var(--muted, #64748b); font-size: .7rem; font-weight: 600; padding: 8px 6px; text-align: center; }
    .gantt-table td { border-right: 1px solid var(--row-border, #f1f5f9); padding: 6px 4px; vertical-align: top; }
    .machine-col { text-align: left !important; width: 160px; padding: 8px 12px !important; border-right: 1px solid var(--card-border, #e2e8f0); }
    .machine-td { border-right: 1px solid var(--card-border, #e2e8f0); padding: 10px 12px; vertical-align: middle; }
    .machine-name { color: var(--shell-text, #374151); font-weight: 600; }
    .machine-sub { color: var(--muted, #9ca3af); font-size: .65rem; margin-top: 2px; }
    .shift-row th { font-size: .65rem; font-weight: 400; color: var(--muted, #9ca3af); padding: 4px; border-right: 1px solid var(--row-border, #f1f5f9); }
    .shift-th { width: 90px; }
    .today-col { background: rgba(59,130,246,.06); color: #1d4ed8; }
    .today-badge { background: #2563eb; border-radius: 4px; color: #fff; font-size: .6rem; margin-left: 4px; padding: 1px 4px; }
    .slot-td { padding: 4px; width: 90px; }
    .today-bg { background: rgba(59,130,246,.04); }
    .slot-block { border: 1px solid; border-radius: 7px; font-size: .67rem; padding: 6px; }
    .slot-top { align-items: center; display: flex; gap: 4px; margin-bottom: 2px; }
    .slot-line { font-weight: 700; }
    .slot-prod { color: var(--shell-text, #374151); font-size: .62rem; line-height: 1.3; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .slot-qty { font-size: .68rem; font-weight: 600; margin-top: 3px; color: var(--shell-text, #374151); }
    .slot-plan { color: var(--muted, #9ca3af); font-size: .58rem; }
    .slot-empty { border: 1px dashed var(--card-border, #e2e8f0); border-radius: 7px; height: 68px; }

    /* Nata */
    .nata-card { background: linear-gradient(135deg, #eff6ff, #eef2ff); border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; }
    .nata-card h4 { color: #1e40af; font-size: .88rem; font-weight: 700; margin: 0 0 6px; }
    .nata-card p { color: #3b82f6; font-size: .75rem; margin: 0 0 14px; }
    .nata-inputs { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 14px; }
    .input-group label { color: #3730a3; display: block; font-size: .72rem; font-weight: 600; margin-bottom: 5px; }
    .date-input, .sel { background: #fff; border: 1px solid #a5b4fc; border-radius: 8px; color: #374151; font-size: .82rem; outline: none; padding: 7px 10px; }
    .date-input:focus, .sel:focus { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,.2); }
    .warn-box { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; color: #b91c1c; font-size: .78rem; font-weight: 600; margin-bottom: 12px; padding: 10px 12px; }
    .nata-timeline { align-items: flex-start; display: flex; flex-wrap: wrap; gap: 4px; overflow-x: auto; padding-bottom: 4px; }
    .nata-step { align-items: center; display: flex; flex-direction: column; min-width: 85px; text-align: center; }
    .step-circle { align-items: center; border-radius: 50%; color: #fff; display: flex; font-size: .72rem; font-weight: 800; height: 30px; justify-content: center; width: 30px; box-shadow: 0 2px 6px rgba(0,0,0,.15); }
    .step-circle.purple { background: #7c3aed; } .step-circle.blue { background: #2563eb; } .step-circle.indigo { background: #4f46e5; }
    .step-circle.orange { background: #ea580c; } .step-circle.yellow { background: #ca8a04; } .step-circle.green { background: #16a34a; }
    .step-label { color: #374151; font-size: .67rem; font-weight: 600; margin-top: 5px; line-height: 1.3; }
    .step-date { color: #6b7280; font-family: monospace; font-size: .62rem; margin-top: 2px; }
    .step-date.past { color: #dc2626; font-weight: 700; }
    .step-arrow { align-self: center; color: #93c5fd; font-size: 1.2rem; margin-bottom: 20px; }

    :host-context(.dark-theme) .sum-card,
    :host-context(.dark-theme) .gantt-card,
    :host-context(.dark-theme) .nav-btn { background: #172033; border-color: #334155; }
    :host-context(.dark-theme) .nav-btn { color: #e2e8f0; }
    :host-context(.dark-theme) .gantt-table th { background: #1e293b; border-color: #334155; }
    :host-context(.dark-theme) .gantt-table td { border-color: #334155; }
    :host-context(.dark-theme) .machine-td { border-color: #334155; }
    :host-context(.dark-theme) .slot-empty { border-color: #334155; }
    :host-context(.dark-theme) .slot-block { border-color: transparent; }
    :host-context(.dark-theme) .slot-prod,
    :host-context(.dark-theme) .slot-qty { color: #e2e8f0; }
    :host-context(.dark-theme) .nata-card { background: linear-gradient(135deg, #1e293b, #1e1b4b); border-color: #3730a3; }
    :host-context(.dark-theme) .nata-card p { color: #a5b4fc; }
    :host-context(.dark-theme) .date-input,
    :host-context(.dark-theme) .sel { background: #1e293b; border-color: #4338ca; color: #e2e8f0; }
    :host-context(.dark-theme) .step-label { color: #e2e8f0; }
    :host-context(.dark-theme) .step-date { color: #94a3b8; }
    :host-context(.dark-theme) .machine-name { color: #e2e8f0; }
    :host-context(.dark-theme) .sum-val { color: #f1f5f9; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningScheduleComponent {
  protected readonly LINE_CSS = LINE_CSS;
  protected readonly SLOT_CSS = SLOT_CSS;
  protected readonly machines = PLANNING_MACHINES;
  protected readonly machineLabels = PLANNING_MACHINE_LABELS;

  private readonly lang = inject(LanguageService);
  private readonly svc = inject(PlanningService);

  startOffset = signal(-2);
  targetDate  = signal(this.svc.todayStr());
  nuoiDays    = signal(18);

  t(key: string): string { return this.lang.translate(key); }
  get isVi(): boolean { return this.lang.language() === 'vi'; }

  days = computed(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(this.svc.todayStr());
      dt.setDate(dt.getDate() + this.startOffset() + i);
      const date = dt.toISOString().split('T')[0];
      const display = dt.toLocaleDateString(this.isVi ? 'vi-VN' : 'zh-TW', { month: 'short', day: 'numeric', weekday: 'short' });
      return { date, display, isToday: date === this.svc.todayStr() };
    });
  });

  getSlot(date: string, machine: string, shift: string): ProductionSlot | undefined {
    return this.svc.getSlotFor(date, machine, shift);
  }

  get summaryCards() {
    const slots = this.svc.slots();
    const totalPlanned = slots.reduce((s, sl) => s + sl.plannedQty, 0);
    const totalActual  = slots.filter(s => s.actualQty !== null).reduce((s, sl) => s + (sl.actualQty ?? 0), 0);
    const doneSlots    = slots.filter(s => s.status === 'done').length;
    const inProgSlots  = slots.filter(s => s.status === 'in-progress').length;
    return [
      { label: this.isVi ? 'Tổng kế hoạch' : '計劃總量',   value: totalPlanned.toLocaleString() + ' kg', color: '' },
      { label: this.isVi ? 'Đã thực hiện' : '已完成量',    value: totalActual.toLocaleString() + ' kg',  color: 'blue' },
      { label: this.isVi ? 'Ca đã hoàn thành' : '已完成班次', value: doneSlots.toString(),               color: 'green' },
      { label: this.isVi ? 'Đang sản xuất' : '生產中',     value: inProgSlots.toString(),                color: 'yellow' },
    ];
  }

  get statusLegend() {
    return [
      { label: this.isVi ? 'Kế hoạch' : '計劃',       css: 'slot-planned' },
      { label: this.isVi ? 'Đang SX' : '進行中',      css: 'slot-inprog' },
      { label: this.isVi ? 'Hoàn thành' : '已完成',   css: 'slot-done' },
      { label: this.isVi ? 'Trễ' : '延遲',            css: 'slot-delayed' },
    ];
  }

  isPast = computed(() => new Date(this.catDate()) < new Date(this.svc.todayStr()));

  catDate = computed(() => this.subD(this.targetDate(), this.nuoiDays() + 3));
  thuDate = computed(() => this.subD(this.targetDate(), 3));
  giaNhietDate = computed(() => this.subD(this.targetDate(), 2));
  catHatDate   = computed(() => this.subD(this.targetDate(), 1));

  nataSteps = computed(() => [
    { label: this.isVi ? 'Cấy vi sinh' : '接種菌種', date: this.catDate(), color: 'purple', isRange: false },
    { label: this.isVi ? `Nuôi (${this.nuoiDays()} ngày)` : `培養(${this.nuoiDays()}天)`, date: `${this.fmtDate(this.catDate())} → ${this.fmtDate(this.thuDate())}`, color: 'blue', isRange: true },
    { label: this.isVi ? 'Thu hoạch' : '採收',      date: this.thuDate(),      color: 'indigo', isRange: false },
    { label: this.isVi ? 'Gia nhiệt' : '加熱',      date: this.giaNhietDate(), color: 'orange', isRange: false },
    { label: this.isVi ? 'Cắt hạt lựu' : '切粒',   date: this.catHatDate(),   color: 'yellow', isRange: false },
    { label: this.isVi ? 'SX thành phẩm' : '成品生產', date: this.targetDate(), color: 'green', isRange: false },
  ]);

  isPastDate(date: string): boolean { return new Date(date) < new Date(this.svc.todayStr()); }

  fmtDate(s: string): string {
    return new Date(s).toLocaleDateString(this.isVi ? 'vi-VN' : 'zh-TW', { day: '2-digit', month: '2-digit', weekday: 'short' });
  }

  private subD(base: string, n: number): string { return this.svc.addDays(base, -n); }
}
