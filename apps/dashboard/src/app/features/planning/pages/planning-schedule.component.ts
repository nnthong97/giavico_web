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

    /* ── Header ── */
    .page-header { align-items: flex-start; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    h3 { color: var(--text, #f1f5f9); font-size: 1.08rem; font-weight: 700; margin: 0; }
    .page-header p { color: var(--muted, #94a3b8); font-size: .76rem; margin: 3px 0 0; }

    /* ── Tabs ── */
    .tab-group { display: flex; gap: 8px; flex-shrink: 0; }
    .tab-btn { background: #1a2a3f; border: 1.5px solid #334155; border-radius: 8px; color: #94a3b8; cursor: pointer; font-size: .8rem; font-weight: 600; padding: 9px 16px; transition: all .15s; white-space: nowrap; }
    .tab-btn:hover { border-color: #3b82f6; color: #93c5fd; background: #1e3a5f; }
    .tab-btn.active { background: #1e3a5f; border-color: #3b82f6; border-width: 2px; color: #93c5fd; box-shadow: 0 0 0 1px #3b82f6 inset; }
    /* GV tab has orange accent even when inactive, so user can find it */
    .tab-btn.gv-tab { background: #1e0e00; border-color: #78350f; color: #f97316; }
    .tab-btn.gv-tab:hover { border-color: #f97316; color: #fdba74; background: #2d1500; }
    .tab-btn.gv-tab.active { background: #431407; border-color: #f97316; border-width: 2px; color: #fdba74; box-shadow: 0 0 0 1px #f97316 inset; }

    /* ── Summary ── */
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

    /* ── Nata card ── */
    .nata-card { background: linear-gradient(135deg, #0f172a, #1e1b4b); border: 1px solid #3730a3; border-radius: 12px; padding: 16px; }
    .nata-card h4 { color: #a5b4fc; font-size: .88rem; font-weight: 700; margin: 0 0 6px; }
    .nata-card p  { color: #818cf8; font-size: .74rem; margin: 0 0 14px; }
    .nata-inputs  { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 14px; }
    .input-group  { display: flex; flex-direction: column; gap: 4px; }
    .input-group label { color: #818cf8; font-size: .7rem; font-weight: 600; }
    .warn-box { background: #450a0a; border: 1px solid #ef4444; border-radius: 8px; color: #fca5a5; font-size: .77rem; font-weight: 600; margin-bottom: 12px; padding: 9px 12px; }
    .nata-timeline { align-items: flex-start; display: flex; flex-wrap: wrap; gap: 4px; }
    .nata-step { align-items: center; display: flex; flex-direction: column; min-width: 80px; text-align: center; }
    .step-circle { align-items: center; border-radius: 50%; color: #fff; display: flex; font-size: .7rem; font-weight: 800; height: 28px; justify-content: center; width: 28px; box-shadow: 0 2px 6px rgba(0,0,0,.3); }
    .step-circle.purple { background: #7c3aed; } .step-circle.blue { background: #2563eb; }
    .step-circle.indigo { background: #4f46e5; } .step-circle.orange { background: #ea580c; }
    .step-circle.yellow { background: #ca8a04; } .step-circle.green { background: #16a34a; }
    .step-label { color: #c7d2fe; font-size: .65rem; font-weight: 600; margin-top: 4px; line-height: 1.3; }
    .step-date { color: #64748b; font-family: monospace; font-size: .6rem; margin-top: 2px; }
    .step-date.past { color: #f87171; font-weight: 700; }
    .step-arrow { align-self: center; color: #334155; font-size: 1.1rem; margin-bottom: 20px; }

    /* ── GV Scheduler Layout ── */
    .gv-scheduler-layout { display: grid; grid-template-columns: 340px 1fr; gap: 16px; align-items: start; }
    @media (max-width: 900px) { .gv-scheduler-layout { grid-template-columns: 1fr; } }

    /* ── Order Panel ── */
    .order-panel { background: var(--card-bg, #172033); border: 1px solid var(--border, #334155); border-radius: 12px; display: flex; flex-direction: column; gap: 12px; padding: 14px; }
    .panel-header { align-items: center; display: flex; justify-content: space-between; }
    .panel-title { color: #f1f5f9; font-size: .88rem; font-weight: 700; }
    .order-count { background: #1e3a5f; border-radius: 99px; color: #60a5fa; font-size: .72rem; font-weight: 700; padding: 2px 10px; }
    .result-count { background: #3b0764; border-radius: 99px; color: #c4b5fd; font-size: .7rem; font-weight: 700; padding: 2px 8px; margin-left: 6px; }

    .order-list { display: flex; flex-direction: column; gap: 10px; max-height: 560px; overflow-y: auto; padding-right: 2px; }
    .order-list::-webkit-scrollbar { width: 4px; }
    .order-list::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }

    .order-card { background: #0f1a2b; border: 1px solid #1e3a5f; border-radius: 8px; padding: 10px 12px; }
    .order-card-top { align-items: center; display: flex; justify-content: space-between; margin-bottom: 8px; }
    .order-id { color: #94a3b8; font-size: .7rem; font-family: monospace; }
    .remove-btn { background: none; border: none; color: #64748b; cursor: pointer; font-size: .8rem; padding: 0 2px; }
    .remove-btn:hover { color: #ef4444; }

    .order-fields { display: flex; flex-direction: column; gap: 7px; }
    .field-group { display: flex; flex-direction: column; gap: 3px; }
    .field-group label { color: #64748b; font-size: .67rem; font-weight: 600; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }

    .field-input, .field-select {
      background: #172033; border: 1px solid #334155; border-radius: 6px;
      color: #e2e8f0; font-size: .78rem; outline: none; padding: 6px 8px; width: 100%; box-sizing: border-box;
    }
    .field-input.sm, .field-select.sm { font-size: .72rem; padding: 5px 6px; }
    .field-input:focus, .field-select:focus { border-color: #3b82f6; }

    .order-meta { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 3px; }
    .meta-tag { border-radius: 4px; font-size: .63rem; font-weight: 700; padding: 2px 6px; background: #1e293b; color: #94a3b8; }
    .machine-tag { background: #1e3a5f; color: #60a5fa; }
    .sugar-tag { background: #422006; color: #fb923c; }

    /* ── Panel actions ── */
    .panel-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .add-btn { background: #172033; border: 1px solid #334155; border-radius: 8px; color: #94a3b8; cursor: pointer; font-size: .8rem; padding: 8px 12px; flex: 1; }
    .add-btn:hover { border-color: #3b82f6; color: #60a5fa; }
    .schedule-btn { background: linear-gradient(135deg, #1d4ed8, #7c3aed); border: none; border-radius: 8px; color: #fff; cursor: pointer; font-size: .82rem; font-weight: 700; padding: 9px 16px; flex: 2; }
    .schedule-btn:hover { opacity: .9; }
    .reset-btn { background: #1e293b; border: 1px solid #475569; border-radius: 8px; color: #94a3b8; cursor: pointer; font-size: .78rem; padding: 8px 10px; }
    .reset-btn:hover { border-color: #ef4444; color: #f87171; }

    /* ── Sugar summary ── */
    .sugar-summary { background: #1a0e00; border: 1px solid #78350f; border-radius: 8px; padding: 10px 12px; }
    .sugar-title { color: #fbbf24; font-size: .75rem; font-weight: 700; margin-bottom: 8px; }
    .sugar-row { align-items: center; display: flex; font-size: .7rem; gap: 8px; padding: 3px 0; border-bottom: 1px solid #292524; }
    .sugar-row:last-child { border-bottom: none; }
    .sugar-type { border-radius: 4px; font-size: .65rem; font-weight: 800; padding: 2px 6px; }
    .sugar-BCH001 { background: #1e3a5f; color: #60a5fa; }
    .sugar-BCH047 { background: #3d1a00; color: #fb923c; }
    .sugar-BCH048 { background: #1a001a; color: #e879f9; }
    .sugar-BTS009 { background: #001a1a; color: #2dd4bf; }
    .sugar-BCH011 { background: #1a1a00; color: #facc15; }
    .sugar-order { color: #94a3b8; flex: 1; font-family: monospace; font-size: .65rem; }
    .sugar-heat { color: #f97316; font-weight: 600; white-space: nowrap; }
    .sugar-qty { color: #64748b; font-size: .65rem; white-space: nowrap; }

    /* ── Result panel ── */
    .result-panel { background: var(--card-bg, #172033); border: 1px solid var(--border, #334155); border-radius: 12px; display: flex; flex-direction: column; gap: 12px; overflow: hidden; padding: 14px; }
    .gantt-nav-sm { align-items: center; display: flex; gap: 4px; }
    .gv-gantt-scroll { overflow-x: auto; border: 1px solid #1e293b; border-radius: 8px; }
    .gv-gantt th { background: #0f1a2b; }

    /* ── Warnings ── */
    .warnings-section { background: #0f0a00; border: 1px solid #78350f; border-radius: 8px; padding: 10px 12px; }
    .warn-title { color: #f59e0b; font-size: .78rem; font-weight: 700; margin-bottom: 8px; }
    .warn-item { align-items: flex-start; border-radius: 6px; display: flex; font-size: .72rem; gap: 7px; line-height: 1.45; margin-bottom: 5px; padding: 6px 10px; }
    .warn-item:last-child { margin-bottom: 0; }
    .warn-error   { background: #450a0a; color: #fca5a5; }
    .warn-warning { background: #422006; color: #fdba74; }
    .warn-info    { background: #1e3a5f; color: #93c5fd; }
    .warn-icon { flex-shrink: 0; }
    .warn-msg { flex: 1; }
    .success-box { background: #052e16; border: 1px solid #16a34a; border-radius: 8px; color: #4ade80; font-size: .8rem; font-weight: 600; padding: 10px 14px; }

    /* ── Material table ── */
    .material-section { background: #0f1a2b; border: 1px solid #1e293b; border-radius: 8px; padding: 10px 12px; }
    .material-title { color: #94a3b8; font-size: .75rem; font-weight: 700; margin-bottom: 8px; }
    .material-table-wrap { overflow-x: auto; }
    .material-table { border-collapse: collapse; font-size: .7rem; width: 100%; }
    .material-table th { background: #0d1525; border-bottom: 1px solid #1e293b; color: #475569; font-weight: 600; padding: 5px 8px; text-align: left; }
    .material-table td { border-bottom: 1px solid #0f1a2b; color: #94a3b8; padding: 5px 8px; }
    .material-table td small { color: #475569; font-size: .62rem; }
    .qty-cell { color: #e2e8f0; font-weight: 600; text-align: right; }

    /* ── Light theme overrides ── */
    :host-context(.light-theme) h3                  { color: #1e293b; }
    :host-context(.light-theme) .page-header p      { color: #64748b; }
    :host-context(.light-theme) .sum-card           { background: #fff; border-color: #e2e8f0; }
    :host-context(.light-theme) .sum-val            { color: #1e293b; }
    :host-context(.light-theme) .sum-label          { color: #64748b; }
    /* Tabs light mode: strong borders + distinct GV orange even inactive */
    :host-context(.light-theme) .tab-btn            { background: #f1f5f9; border-color: #94a3b8; border-width: 1.5px; color: #374151; }
    :host-context(.light-theme) .tab-btn:hover      { background: #dbeafe; border-color: #3b82f6; color: #1d4ed8; }
    :host-context(.light-theme) .tab-btn.active     { background: #dbeafe; border-color: #2563eb; border-width: 2px; color: #1d4ed8; }
    :host-context(.light-theme) .tab-btn.gv-tab     { background: #fff7ed; border-color: #f97316; border-width: 1.5px; color: #c2410c; }
    :host-context(.light-theme) .tab-btn.gv-tab:hover { background: #ffedd5; border-color: #ea580c; color: #9a3412; }
    :host-context(.light-theme) .tab-btn.gv-tab.active { background: #ffedd5; border-color: #ea580c; border-width: 2px; color: #9a3412; box-shadow: 0 0 0 1px #f97316 inset; }
    :host-context(.light-theme) .gantt-card         { background: #fff; border-color: #e2e8f0; }
    :host-context(.light-theme) .gantt-table th     { background: #f8fafc; color: #94a3b8; }
    :host-context(.light-theme) .gantt-table td     { border-color: #f1f5f9; }
    :host-context(.light-theme) .machine-td         { border-color: #e2e8f0; }
    :host-context(.light-theme) .machine-name       { color: #374151; }
    :host-context(.light-theme) .machine-sub        { color: #9ca3af; }
    :host-context(.light-theme) .slot-empty         { border-color: #e2e8f0; }
    :host-context(.light-theme) .nav-btn            { background: #fff; border-color: #e2e8f0; color: #374151; }

    /* Light theme slot colors (need light bg + dark text contrast) */
    :host-context(.light-theme) .slot-planned  { background: #dbeafe; border-color: #3b82f6; }
    :host-context(.light-theme) .slot-inprog   { background: #fef3c7; border-color: #f59e0b; }
    :host-context(.light-theme) .slot-done     { background: #dcfce7; border-color: #22c55e; }
    :host-context(.light-theme) .slot-delayed  { background: #fee2e2; border-color: #ef4444; }
    :host-context(.light-theme) .slot-new      { background: #f3e8ff; border-color: #a855f7; }
    :host-context(.light-theme) .slot-line     { color: #1e293b; }
    :host-context(.light-theme) .slot-prod     { color: #374151; }
    :host-context(.light-theme) .slot-qty      { color: #1e293b; }
    :host-context(.light-theme) .qty-actual    { color: #16a34a; }
    :host-context(.light-theme) .slot-plan     { color: #6b7280; }

    :host-context(.light-theme) .order-panel, :host-context(.light-theme) .result-panel { background: #fff; border-color: #e2e8f0; }
    :host-context(.light-theme) .order-card      { background: #f8fafc; border-color: #e2e8f0; }
    :host-context(.light-theme) .panel-title      { color: #1e293b; }
    :host-context(.light-theme) .field-input, :host-context(.light-theme) .field-select { background: #fff; border-color: #d1d5db; color: #1e293b; }
    :host-context(.light-theme) .add-btn          { background: #f8fafc; border-color: #d1d5db; color: #374151; }
    :host-context(.light-theme) .nata-card        { background: linear-gradient(135deg, #eff6ff, #eef2ff); border-color: #bfdbfe; }
    :host-context(.light-theme) .nata-card h4     { color: #1e40af; }
    :host-context(.light-theme) .nata-card p      { color: #3b82f6; }
    :host-context(.light-theme) .step-label       { color: #374151; }
    :host-context(.light-theme) .step-date        { color: #6b7280; }
    :host-context(.light-theme) .gv-gantt-scroll  { border-color: #e2e8f0; }
    :host-context(.light-theme) .gv-gantt th      { background: #f8fafc; }
    :host-context(.light-theme) .material-section { background: #f8fafc; border-color: #e2e8f0; }
    :host-context(.light-theme) .material-table th { background: #f1f5f9; color: #64748b; }
    :host-context(.light-theme) .material-table td { color: #374151; border-color: #f1f5f9; }
    :host-context(.light-theme) .warnings-section { background: #fffbeb; border-color: #fde68a; }
    :host-context(.light-theme) .warn-error   { background: #fee2e2; color: #b91c1c; }
    :host-context(.light-theme) .warn-warning { background: #fff7ed; color: #c2410c; }
    :host-context(.light-theme) .warn-info    { background: #eff6ff; color: #1d4ed8; }
    :host-context(.light-theme) .success-box  { background: #f0fdf4; border-color: #86efac; color: #15803d; }
    :host-context(.light-theme) .sugar-summary { background: #fffbeb; border-color: #fde68a; }
    :host-context(.light-theme) .sugar-row     { border-color: #fef3c7; }
    :host-context(.light-theme) .sugar-BCH047  { background: #fff7ed; color: #c2410c; }
  `],
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
