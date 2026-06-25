import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/i18n/language.service';
import { PlanningService } from '../data-access/planning.service';
import { GvService } from '../gv/data-access/gv.service';
import { GV_PRODUCTS, GV_MACHINES } from '../gv/data/gv-mock.data';
import { GVOrderInput } from '../gv/models/gv.model';
import { PLANNING_MACHINES, PLANNING_MACHINE_LABELS } from '../data/planning-mock.data';

// ─── Status / Line color maps ──────────────────────────────────────────────────
const LINE_CSS: Record<string, string> = { AV: 'line-av', ND: 'line-nd', GV: 'line-gv' };
const SLOT_CSS: Record<string, string> = {
  planned: 'slot-planned', 'in-progress': 'slot-inprog', done: 'slot-done', delayed: 'slot-delayed',
};

@Component({
  selector: 'app-planning-schedule',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sched-page">

      <!-- ── Top nav: Combined | GV Scheduler ─────────────────────────────── -->
      <div class="page-header">
        <div>
          <h3>{{ tl('Production Schedule', 'Lịch Sản Xuất', '生產排程') }}</h3>
          <p>{{ tl('Gantt – AV / ND / GV · GV Auto-Scheduler', 'Gantt – AV / ND / GV · GV Tự Động Lên Lịch', 'Gantt – AV/ND/GV · GV自動排程') }}</p>
        </div>
        <div class="tab-group">
          <button class="tab-btn" [class.active]="viewMode() === 'gantt'"      (click)="viewMode.set('gantt')">
            📅 {{ tl('Gantt View', 'Gantt Tổng Hợp', '甘特圖總覽') }}
          </button>
          <button class="tab-btn gv-tab" [class.active]="viewMode() === 'gv-scheduler'" (click)="viewMode.set('gv-scheduler')">
            🔧 {{ tl('GV Auto-Scheduler', 'GV Tự Động Lên Lịch', 'GV自動排程') }}
          </button>
        </div>
      </div>

      <!-- ══════════════════ TAB 1: GANTT TỔNG HỢP ════════════════════════ -->
      @if (viewMode() === 'gantt') {

        <!-- Summary cards -->
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
            <div class="legend-item"><div class="leg-dot" [class]="l.css"></div>{{ l.label }}</div>
          }
          <div class="legend-sep"></div>
          @for (line of ['AV', 'ND', 'GV']; track line) {
            <div class="legend-item"><div class="line-dot" [class]="LINE_CSS[line]"></div>{{ line }}</div>
          }
        </div>

        <!-- Nav -->
        <div class="gantt-nav">
          <button class="nav-btn" (click)="startOffset.set(startOffset() - 7)">‹</button>
          <button class="nav-btn today-btn" (click)="startOffset.set(-2)">📅 {{ tl('Today', 'Hôm nay', '今天') }}</button>
          <button class="nav-btn" (click)="startOffset.set(startOffset() + 7)">›</button>
          <span class="gantt-range">{{ ganttRangeLabel() }}</span>
        </div>

        <!-- Gantt table -->
        <div class="gantt-card">
          <div class="table-scroll">
            <table class="gantt-table">
              <thead>
                <tr>
                  <th class="machine-col">{{ tl('Machine', 'Máy', '機台') }}</th>
                  @for (day of days(); track day.date) {
                    <th colspan="2" [class.today-col]="day.isToday">
                      {{ day.display }}
                      @if (day.isToday) { <span class="today-badge">{{ tl('Today', 'HN', '今') }}</span> }
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
                @for (machine of allMachines; track machine) {
                  <tr>
                    <td class="machine-td">
                      <div class="machine-name">{{ machine }}</div>
                      <div class="machine-sub">{{ getMachineLabel(machine) }}</div>
                    </td>
                    @for (day of days(); track day.date) {
                      @for (shift of shifts; track shift) {
                        <td class="slot-td" [class.today-bg]="day.isToday">
                          @let slot = svc.getSlotFor(day.date, machine, shift);
                          @if (slot) {
                            <div class="slot-block" [class]="SLOT_CSS[slot.status]">
                              <div class="slot-top">
                                <div class="line-dot sm" [class]="LINE_CSS[slot.productLine]"></div>
                                <span class="slot-line">{{ slot.productLine }}</span>
                                <span class="slot-status-dot" [class]="SLOT_CSS[slot.status]" title="{{ slot.status }}">●</span>
                              </div>
                              <div class="slot-prod" [title]="slot.productName">
                                {{ slot.productName.split(' ').slice(-2).join(' ') }}
                              </div>
                              <div class="slot-qty">
                                @if (slot.actualQty !== null) {
                                  <span class="qty-actual">✓ {{ fmtKg(slot.actualQty) }}</span>
                                } @else {
                                  {{ fmtKg(slot.plannedQty) }}
                                }
                              </div>
                              @if (slot.actualQty !== null) {
                                <div class="slot-plan">{{ tl('plan:', 'kh:', '計:') }}{{ fmtKg(slot.plannedQty) }}</div>
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
          <h4>🌿 {{ tl('Nata Backward Scheduler (ND)', 'Kế Hoạch Nata – Backward Scheduling', '椰果計劃 – 反向排程') }}</h4>
          <p>{{ tl('Production date → inoculation / harvest / heating / cutting dates', 'Ngày SX thành phẩm → tự tính: cấy, thu hoạch, gia nhiệt, cắt', '成品生產日 → 自動計算：接種、採收、加熱、切割') }}</p>
          <div class="nata-inputs">
            <div class="input-group">
              <label>{{ tl('ND Target Production Date:', 'Ngày SX ND:', 'ND成品預計生產日:') }}</label>
              <input type="date" [(ngModel)]="targetDate" class="field-input" />
            </div>
            <div class="input-group">
              <label>{{ tl('Cultivation days:', 'Số ngày nuôi:', '培養天數:') }}</label>
              <select [(ngModel)]="nuoiDays" class="field-select">
                @for (n of [14,15,16,17,18,19,20,21]; track n) {
                  <option [value]="n">{{ n }} {{ tl('days', 'ngày', '天') }}</option>
                }
              </select>
            </div>
          </div>
          @if (isPast()) {
            <div class="warn-box">⚠️ {{ tl('Inoculation date', 'Ngày cấy cần là', '需接種日') }} {{ fmtDate(nataSteps()[0].date) }} {{ tl('– already passed!', '– đã qua!', '– 已過！') }}</div>
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
      }

      <!-- ══════════════════ TAB 2: GV AUTO-SCHEDULER ══════════════════════ -->
      @if (viewMode() === 'gv-scheduler') {
        <div class="gv-scheduler-layout">

          <!-- ── Left: Order Input Panel ────────────────────────────────── -->
          <div class="order-panel">
            <div class="panel-header">
              <span class="panel-title">{{ tl('GV Pending Orders', 'Đơn GV Cần Lên Lịch', 'GV待排程訂單') }}</span>
              <span class="order-count">{{ gvSvc.pendingOrders().length }} {{ tl('orders', 'đơn', '筆') }}</span>
            </div>

            <div class="order-list">
              @for (order of gvSvc.pendingOrders(); track order.orderId; let i = $index) {
                <div class="order-card">
                  <div class="order-card-top">
                    <span class="order-id">{{ order.orderId }}</span>
                    <button class="remove-btn" (click)="removeOrder(order.orderId)" title="Xóa đơn">✕</button>
                  </div>
                  <div class="order-fields">
                    <div class="field-group">
                      <label>{{ tl('Product', 'Sản phẩm', '產品') }}</label>
                      <select class="field-select sm" [value]="order.productCode"
                        (change)="updateOrderField(order.orderId, 'productCode', $any($event.target).value)">
                        @for (p of GV_PRODUCTS; track p.productCode) {
                          <option [value]="p.productCode" [selected]="p.productCode === order.productCode">
                            {{ p.nameVN }}
                          </option>
                        }
                      </select>
                    </div>
                    <div class="field-row">
                      <div class="field-group">
                        <label>{{ tl('Qty (kg)', 'SL (kg)', '數量(kg)') }}</label>
                        <input type="number" class="field-input sm" [value]="order.qty"
                          (change)="updateOrderField(order.orderId, 'qty', +$any($event.target).value)"
                          min="1000" step="1000" />
                      </div>
                      <div class="field-group">
                        <label>{{ tl('ETD', 'Ngày Giao', '交期') }}</label>
                        <input type="date" class="field-input sm" [value]="order.etd"
                          (change)="updateOrderField(order.orderId, 'etd', $any($event.target).value)" />
                      </div>
                    </div>
                    <div class="order-meta">
                      @let cfg = gvSvc.getProductConfig(order.productCode);
                      @if (cfg) {
                        <span class="meta-tag machine-tag">{{ cfg.machineRequired }}</span>
                        <span class="meta-tag sugar-tag">{{ cfg.sugarType }}</span>
                        <span class="meta-tag">{{ (order.qty / 1000).toFixed(0) }} MT</span>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>

            <div class="panel-actions">
              <button class="add-btn" (click)="addNewOrder()">
                + {{ tl('Add Order', 'Thêm Đơn', '新增訂單') }}
              </button>
              <button class="schedule-btn" (click)="runScheduler()">
                🔄 {{ tl('Auto Schedule', 'Tự Động Lên Lịch', '自動排程') }}
              </button>
              @if (gvSvc.scheduleResult()) {
                <button class="reset-btn" (click)="gvSvc.resetSchedule()">
                  ✕ {{ tl('Reset', 'Đặt Lại', '重置') }}
                </button>
              }
            </div>

            <!-- Sugar tasks summary -->
            @if (gvSvc.scheduleResult()?.sugarTasks?.length) {
              <div class="sugar-summary">
                <div class="sugar-title">🍬 {{ tl('Sugar Preparation Tasks', 'Lịch Gia Nhiệt Đường', '融糖計劃') }}</div>
                @for (task of gvSvc.scheduleResult()!.sugarTasks; track task.orderId) {
                  <div class="sugar-row">
                    <span class="sugar-type" [class]="'sugar-' + task.sugarType">{{ task.sugarType }}</span>
                    <span class="sugar-order">{{ task.orderId }}</span>
                    <span class="sugar-heat">🔥 {{ task.heatDate }}</span>
                    <span class="sugar-qty">{{ (task.sugarQtyKg / 1000).toFixed(1) }} t</span>
                  </div>
                }
              </div>
            }
          </div>

          <!-- ── Right: Result Gantt ────────────────────────────────────── -->
          <div class="result-panel">
            <div class="panel-header">
              <span class="panel-title">
                @if (gvSvc.scheduleResult()) {
                  ✅ {{ tl('Scheduled Result', 'Kết Quả Lên Lịch', '排程結果') }}
                  <span class="result-count">{{ gvSvc.scheduleResult()!.slots.length }} {{ tl('slots', 'ca', '班次') }}</span>
                } @else {
                  📅 {{ tl('GV Gantt (existing)', 'GV Gantt (hiện tại)', 'GV甘特圖(現況)') }}
                }
              </span>
              <!-- Nav -->
              <div class="gantt-nav-sm">
                <button class="nav-btn sm" (click)="gvOffset.set(gvOffset() - 7)">‹</button>
                <button class="nav-btn sm" (click)="gvOffset.set(0)">{{ tl('Now', 'HN', '今') }}</button>
                <button class="nav-btn sm" (click)="gvOffset.set(gvOffset() + 7)">›</button>
              </div>
            </div>

            <!-- GV-only Gantt -->
            <div class="gv-gantt-scroll">
              <table class="gantt-table gv-gantt">
                <thead>
                  <tr>
                    <th class="machine-col sm">{{ tl('Machine', 'Máy', '機台') }}</th>
                    @for (day of gvDays(); track day.date) {
                      <th colspan="2" [class.today-col]="day.isToday" [class.scheduled-col]="hasScheduledOnDate(day.date)">
                        <div class="day-header">{{ day.shortDisplay }}</div>
                        @if (day.isToday) { <div class="today-pip"></div> }
                        @if (hasScheduledOnDate(day.date)) { <div class="sched-pip"></div> }
                      </th>
                    }
                  </tr>
                  <tr class="shift-row">
                    <th class="machine-col sm"></th>
                    @for (day of gvDays(); track day.date) {
                      <th class="shift-th xs" [class.today-col]="day.isToday">D</th>
                      <th class="shift-th xs" [class.today-col]="day.isToday">N</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (m of GV_MACHINES; track m.code) {
                    <tr>
                      <td class="machine-td sm">
                        <div class="machine-name sm">{{ m.code }}</div>
                        <div class="machine-cap">{{ (m.capacityKgPerShift / 1000).toFixed(0) }}t/ca</div>
                      </td>
                      @for (day of gvDays(); track day.date) {
                        @for (shift of shifts; track shift) {
                          <td class="slot-td xs" [class.today-bg]="day.isToday">
                            @let slot = gvSvc.getSlotFor(day.date, m.code, shift);
                            @if (slot) {
                              <div class="slot-block gv-slot" [class]="isScheduledSlot(slot) ? 'slot-new' : slotStatusCss(slot)">
                                <div class="slot-prod xs" [title]="slot.productName">
                                  {{ shortName(slot.productCode) }}
                                </div>
                                <div class="slot-qty xs">{{ fmtKg(slot.plannedQty) }}</div>
                                @if (isScheduledSlot(slot)) {
                                  <div class="new-badge">NEW</div>
                                }
                              </div>
                            } @else {
                              <div class="slot-empty xs"></div>
                            }
                          </td>
                        }
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Warnings -->
            @if (gvSvc.scheduleResult()?.warnings?.length) {
              <div class="warnings-section">
                <div class="warn-title">⚠️ {{ tl('Warnings', 'Cảnh Báo', '警告') }} ({{ gvSvc.scheduleResult()!.warnings.length }})</div>
                @for (w of gvSvc.scheduleResult()!.warnings; track $index) {
                  <div class="warn-item" [class]="'warn-' + w.severity">
                    <span class="warn-icon">{{ w.severity === 'error' ? '🔴' : w.severity === 'warning' ? '🟡' : 'ℹ️' }}</span>
                    <span class="warn-msg">{{ lang.language() === 'zh-TW' ? w.messageZH : w.messageVN }}</span>
                  </div>
                }
              </div>
            } @else if (gvSvc.scheduleResult() && !gvSvc.scheduleResult()!.warnings.length) {
              <div class="success-box">✅ {{ tl('All orders scheduled without conflicts!', 'Tất cả đơn đã lên lịch thành công, không có xung đột!', '所有訂單排程成功，無衝突！') }}</div>
            }

            <!-- Material requests summary -->
            @if (gvSvc.scheduleResult()?.materialRequests?.length) {
              <div class="material-section">
                <div class="material-title">📦 {{ tl('Raw Material Requests', 'Phiếu Yêu Cầu Nguyên Liệu', '原料需求單') }}</div>
                <div class="material-table-wrap">
                  <table class="material-table">
                    <thead><tr>
                      <th>{{ tl('Date Needed', 'Ngày Cần', '需求日') }}</th>
                      <th>{{ tl('Material', 'Nguyên liệu', '原料') }}</th>
                      <th>{{ tl('Qty (kg)', 'SL (kg)', '數量(kg)') }}</th>
                      <th>{{ tl('Order', 'Đơn', '訂單') }}</th>
                    </tr></thead>
                    <tbody>
                      @for (req of gvSvc.scheduleResult()!.materialRequests; track $index) {
                        <tr>
                          <td>{{ req.neededByDate }}</td>
                          <td>{{ req.materialNameVN }} <small>({{ req.materialCode }})</small></td>
                          <td class="qty-cell">{{ req.quantityKg.toLocaleString() }}</td>
                          <td>{{ req.orderId }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }
          </div>
        </div>
      }

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
    .tab-group { display: flex; gap: 6px; flex-shrink: 0; }
    .tab-btn { background: var(--card-bg, #172033); border: 1px solid var(--border, #334155); border-radius: 8px; color: var(--muted, #94a3b8); cursor: pointer; font-size: .8rem; font-weight: 600; padding: 8px 14px; transition: all .15s; }
    .tab-btn:hover { border-color: #3b82f6; color: #93c5fd; }
    .tab-btn.active { background: #1e3a5f; border-color: #3b82f6; color: #93c5fd; }
    .tab-btn.gv-tab.active { background: #431407; border-color: #f97316; color: #fdba74; }

    /* ── Summary ── */
    .summary-grid { display: grid; gap: 10px; grid-template-columns: repeat(4, 1fr); }
    @media (max-width: 640px) { .summary-grid { grid-template-columns: repeat(2, 1fr); } }
    .sum-card { background: var(--card-bg, #172033); border: 1px solid var(--border, #334155); border-radius: 10px; padding: 12px 14px; }
    .sum-val { font-size: 1.05rem; font-weight: 700; color: var(--text, #f1f5f9); }
    .sum-val.blue { color: #60a5fa; } .sum-val.green { color: #4ade80; } .sum-val.yellow { color: #facc15; }
    .sum-label { color: var(--muted, #64748b); font-size: .7rem; margin-top: 4px; }

    /* ── Legend ── */
    .legend-row { align-items: center; display: flex; flex-wrap: wrap; gap: 10px; }
    .legend-item { align-items: center; display: flex; font-size: .72rem; gap: 5px; color: var(--muted, #94a3b8); }
    .leg-dot { border-radius: 3px; height: 10px; width: 10px; }
    .legend-sep { width: 16px; }
    .line-dot { border-radius: 50%; height: 8px; width: 8px; flex-shrink: 0; }
    .line-dot.sm { height: 6px; width: 6px; }
    .line-av { background: #22c55e; } .line-nd { background: #3b82f6; } .line-gv { background: #f97316; }

    /* ── Slot status colors (dark-mode safe: dark bg + light text) ── */
    .slot-planned  { background: #1e3a5f; border: 1px solid #3b82f6; }
    .slot-inprog   { background: #422006; border: 1px solid #f59e0b; }
    .slot-done     { background: #052e16; border: 1px solid #22c55e; }
    .slot-delayed  { background: #450a0a; border: 1px solid #ef4444; }
    .slot-new      { background: #3b0764; border: 1px solid #a855f7; }

    /* Dot indicators for legend */
    .leg-dot.slot-planned { background: #3b82f6; }
    .leg-dot.slot-inprog  { background: #f59e0b; }
    .leg-dot.slot-done    { background: #22c55e; }
    .leg-dot.slot-delayed { background: #ef4444; }

    /* ── Gantt nav ── */
    .gantt-nav { align-items: center; display: flex; gap: 8px; }
    .nav-btn { background: var(--card-bg, #172033); border: 1px solid var(--border, #334155); border-radius: 8px; color: var(--text, #e2e8f0); cursor: pointer; font-size: .82rem; padding: 6px 12px; }
    .nav-btn:hover { border-color: #3b82f6; }
    .nav-btn.sm { padding: 4px 8px; font-size: .75rem; }
    .today-btn { display: flex; align-items: center; gap: 4px; }
    .gantt-range { color: var(--muted, #64748b); font-size: .75rem; margin-left: 6px; }

    /* ── Gantt card/table ── */
    .gantt-card { background: var(--card-bg, #172033); border: 1px solid var(--border, #334155); border-radius: 12px; overflow: hidden; }
    .table-scroll { overflow-x: auto; }
    .gantt-table { border-collapse: collapse; font-size: .74rem; min-width: 900px; width: 100%; }
    .gantt-table th { background: #111c2e; border-bottom: 1px solid #334155; color: #64748b; font-size: .68rem; font-weight: 600; padding: 7px 5px; text-align: center; }
    .gantt-table td { border-right: 1px solid #1e293b; padding: 4px; vertical-align: top; }
    .machine-col { min-width: 120px; text-align: left !important; padding: 8px 10px !important; border-right: 1px solid #334155 !important; }
    .machine-col.sm { min-width: 80px; }
    .machine-td { border-right: 1px solid #334155; padding: 8px 10px; vertical-align: middle; }
    .machine-td.sm { padding: 5px 7px; }
    .machine-name { color: #e2e8f0; font-weight: 700; font-size: .8rem; }
    .machine-name.sm { font-size: .72rem; }
    .machine-sub { color: #64748b; font-size: .62rem; margin-top: 2px; line-height: 1.3; }
    .machine-cap { color: #475569; font-size: .62rem; margin-top: 1px; }
    .shift-row th { font-size: .62rem; color: #64748b; padding: 3px; }
    .shift-th { width: 82px; } .shift-th.xs { width: 60px; }
    .today-col { background: rgba(59,130,246,.08); color: #60a5fa !important; }
    .today-badge { background: #2563eb; border-radius: 4px; color: #fff; font-size: .58rem; margin-left: 4px; padding: 1px 4px; }
    .today-pip { width: 6px; height: 6px; background: #3b82f6; border-radius: 50%; margin: 2px auto 0; }
    .sched-pip { width: 6px; height: 6px; background: #a855f7; border-radius: 50%; margin: 2px auto 0; }
    .scheduled-col { background: rgba(168,85,247,.06); }
    .slot-td { padding: 3px; width: 82px; }
    .slot-td.xs { width: 60px; }
    .today-bg { background: rgba(59,130,246,.04); }

    /* ── Slot block ── */
    .slot-block { border-radius: 6px; font-size: .65rem; padding: 5px 5px 4px; cursor: default; }
    .gv-slot { padding: 4px; }
    .slot-top { align-items: center; display: flex; gap: 3px; margin-bottom: 2px; }
    .slot-line { font-weight: 800; color: #e2e8f0; font-size: .65rem; }
    .slot-status-dot { font-size: .55rem; margin-left: auto; }
    .slot-status-dot.slot-planned { color: #60a5fa; }
    .slot-status-dot.slot-inprog  { color: #f59e0b; }
    .slot-status-dot.slot-done    { color: #22c55e; }
    .slot-status-dot.slot-delayed { color: #ef4444; }
    .slot-prod { color: #cbd5e1; font-size: .6rem; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 76px; }
    .slot-prod.xs { max-width: 54px; font-size: .58rem; }
    .slot-qty { font-size: .65rem; font-weight: 700; margin-top: 2px; color: #f1f5f9; }
    .slot-qty.xs { font-size: .6rem; }
    .qty-actual { color: #4ade80; }
    .slot-plan { color: #64748b; font-size: .56rem; }
    .slot-empty { border: 1px dashed #1e293b; border-radius: 6px; height: 60px; }
    .slot-empty.xs { height: 48px; }
    .new-badge { background: #7c3aed; border-radius: 3px; color: #fff; font-size: .5rem; font-weight: 800; padding: 1px 3px; margin-top: 2px; display: inline-block; }
    .day-header { font-size: .65rem; }

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
    :host-context(.light-theme) .sum-card           { background: #fff; border-color: #e2e8f0; }
    :host-context(.light-theme) .sum-val            { color: #1e293b; }
    :host-context(.light-theme) .sum-label          { color: #64748b; }
    :host-context(.light-theme) .tab-btn            { background: #f8fafc; border-color: #e2e8f0; color: #64748b; }
    :host-context(.light-theme) .tab-btn.active     { background: #dbeafe; border-color: #3b82f6; color: #1d4ed8; }
    :host-context(.light-theme) .tab-btn.gv-tab.active { background: #ffedd5; border-color: #f97316; color: #ea580c; }
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
  protected readonly GV_PRODUCTS = GV_PRODUCTS;
  protected readonly GV_MACHINES = GV_MACHINES;
  protected readonly allMachines = PLANNING_MACHINES;
  protected readonly shifts = ['day', 'night'] as const;

  readonly lang = inject(LanguageService);
  readonly svc  = inject(PlanningService);
  readonly gvSvc = inject(GvService);

  viewMode   = signal<'gantt' | 'gv-scheduler'>('gantt');
  startOffset = signal(-2);
  gvOffset    = signal(0);
  targetDate  = signal(this.svc.todayStr());
  nuoiDays    = signal(18);

  t(key: string): string { return this.lang.translate(key); }
  tl(en: string, vi: string, zh: string): string {
    const l = this.lang.language();
    return l === 'vi' ? vi : l === 'zh-TW' ? zh : en;
  }
  get locale(): string {
    const l = this.lang.language();
    return l === 'vi' ? 'vi-VN' : l === 'zh-TW' ? 'zh-TW' : 'en-US';
  }

  // ── Gantt days computation ─────────────────────────────────────────────────
  days = computed(() => {
    const locale = this.locale;
    return Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(this.svc.todayStr());
      dt.setDate(dt.getDate() + this.startOffset() + i);
      const date = dt.toISOString().split('T')[0];
      return {
        date,
        display: dt.toLocaleDateString(locale, { month: 'short', day: 'numeric', weekday: 'short' }),
        isToday: date === this.svc.todayStr(),
      };
    });
  });

  gvDays = computed(() => {
    const locale = this.locale;
    return Array.from({ length: 14 }, (_, i) => {
      const dt = new Date(this.svc.todayStr());
      dt.setDate(dt.getDate() + this.gvOffset() + i);
      const date = dt.toISOString().split('T')[0];
      return {
        date,
        shortDisplay: dt.toLocaleDateString(locale, { month: 'numeric', day: 'numeric', weekday: 'narrow' }),
        isToday: date === this.svc.todayStr(),
      };
    });
  });

  ganttRangeLabel = computed(() => {
    const ds = this.days();
    if (!ds.length) return '';
    return `${ds[0].date} → ${ds[ds.length - 1].date}`;
  });

  getMachineLabel(machine: string): string {
    const labels = PLANNING_MACHINE_LABELS[machine];
    if (!labels) return machine;
    const l = this.lang.language();
    return l === 'zh-TW' ? labels.zh : labels.vi;
  }

  // ── Summary cards ─────────────────────────────────────────────────────────
  get summaryCards() {
    const slots = this.svc.slots();
    const totalPlanned = slots.reduce((s, sl) => s + sl.plannedQty, 0);
    const totalActual  = slots.filter(s => s.actualQty !== null).reduce((s, sl) => s + (sl.actualQty ?? 0), 0);
    const doneSlots    = slots.filter(s => s.status === 'done').length;
    const inProg       = slots.filter(s => s.status === 'in-progress').length;
    return [
      { label: this.tl('Planned (all)',  'Tổng kế hoạch', '計劃總量'),      value: this.fmtKg(totalPlanned), color: '' },
      { label: this.tl('Actual output',  'Đã thực hiện',  '已完成量'),      value: this.fmtKg(totalActual),  color: 'blue' },
      { label: this.tl('Done shifts',    'Ca hoàn thành', '已完成班次'),     value: String(doneSlots),        color: 'green' },
      { label: this.tl('In production',  'Đang SX',       '生產中班次'),     value: String(inProg),           color: 'yellow' },
    ];
  }

  get statusLegend() {
    return [
      { label: this.tl('Planned',     'Kế hoạch',    '計劃'),  css: 'slot-planned leg-dot' },
      { label: this.tl('In progress', 'Đang SX',     '進行中'), css: 'slot-inprog leg-dot' },
      { label: this.tl('Completed',   'Hoàn thành',  '已完成'), css: 'slot-done leg-dot' },
      { label: this.tl('Delayed',     'Trễ',         '延遲'),   css: 'slot-delayed leg-dot' },
    ];
  }

  // ── GV Scheduler actions ──────────────────────────────────────────────────
  runScheduler(): void {
    this.gvSvc.runScheduler();
    this.gvOffset.set(0);
  }

  addNewOrder(): void {
    const firstProduct = GV_PRODUCTS[0];
    const etd = this.gvSvc.addDays(this.gvSvc.today(), 30);
    this.gvSvc.addOrder({
      orderId: this.gvSvc.generateOrderId(),
      productCode: firstProduct.productCode,
      qty: 20_000,
      etd,
    });
  }

  removeOrder(id: string): void { this.gvSvc.removeOrder(id); }

  updateOrderField(orderId: string, field: keyof GVOrderInput, value: string | number): void {
    this.gvSvc.updateOrder(orderId, { [field]: value } as Partial<GVOrderInput>);
  }

  hasScheduledOnDate(date: string): boolean {
    const result = this.gvSvc.scheduleResult();
    return !!result?.slots.some(s => s.date === date);
  }

  isScheduledSlot(slot: Record<string, unknown>): boolean {
    return typeof slot['id'] === 'string' && (slot['id'] as string).startsWith('gv-auto-');
  }

  slotStatusCss(slot: Record<string, unknown>): string {
    return SLOT_CSS[(slot['status'] as string) ?? 'planned'] ?? 'slot-planned';
  }

  shortName(productCode: string): string {
    const cfg = this.gvSvc.getProductConfig(productCode);
    if (!cfg) return productCode.split('-')[0];
    const lang = this.lang.language();
    const name = lang === 'zh-TW' ? cfg.nameZH : cfg.nameVN;
    return name.split(' ').slice(0, 2).join(' ');
  }

  fmtKg(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' kt';
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + ' t';
    return n.toString() + ' kg';
  }

  // ── Nata ─────────────────────────────────────────────────────────────────
  isPast = computed(() => new Date(this.catDate()) < new Date(this.svc.todayStr()));
  catDate      = computed(() => this.subD(this.targetDate(), this.nuoiDays() + 3));
  thuDate      = computed(() => this.subD(this.targetDate(), 3));
  giaNhietDate = computed(() => this.subD(this.targetDate(), 2));
  catHatDate   = computed(() => this.subD(this.targetDate(), 1));

  nataSteps = computed(() => [
    { label: this.tl('Inoculation', 'Cấy vi sinh', '接種菌種'),        date: this.catDate(),      color: 'purple', isRange: false },
    { label: this.tl(`Cultivation (${this.nuoiDays()}d)`, `Nuôi (${this.nuoiDays()}ng)`, `培養(${this.nuoiDays()}天)`), date: `${this.fmtDate(this.catDate())} → ${this.fmtDate(this.thuDate())}`, color: 'blue', isRange: true },
    { label: this.tl('Harvest', 'Thu hoạch', '採收'),                  date: this.thuDate(),      color: 'indigo', isRange: false },
    { label: this.tl('Heating', 'Gia nhiệt', '加熱'),                  date: this.giaNhietDate(), color: 'orange', isRange: false },
    { label: this.tl('Cutting', 'Cắt hạt lựu', '切粒'),               date: this.catHatDate(),   color: 'yellow', isRange: false },
    { label: this.tl('Production', 'SX TP ND', 'ND成品生產'),           date: this.targetDate(),  color: 'green',  isRange: false },
  ]);

  isPastDate(date: string): boolean { return new Date(date) < new Date(this.svc.todayStr()); }
  fmtDate(s: string): string {
    return new Date(s).toLocaleDateString(this.locale, { day: '2-digit', month: '2-digit', weekday: 'short' });
  }

  private subD(base: string, n: number): string { return this.svc.addDays(base, -n); }
}
