import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppLanguage, LanguageService } from '../../../core/i18n/language.service';
import { PlanningService } from '../data-access/planning.service';
import { Order } from '../models/planning.model';

const LINE_CSS: Record<string, string> = { AV: 'line-av', ND: 'line-nd', GV: 'line-gv' };
const STATUS_CSS: Record<string, string> = {
  CH: 'status-ch', DL: 'status-dl', TK: 'status-tk', CX: 'status-cx',
  DX: 'status-dx', HU: 'status-hu', NG: 'status-ng', XN: 'status-xn', HM: 'status-hm',
};

@Component({
  selector: 'app-planning-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="dash">
      <!-- Page header -->
      <div class="dash-header">
        <div>
          <h3>{{ tl('System Overview', 'Tổng Quan Hệ Thống Giavico', '系統總覽') }}</h3>
          <p>{{ tl('Updated: ', 'Cập nhật: ', '更新：') + todayStr }}</p>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid">
        @for (kpi of kpis; track kpi.label) {
          <a [routerLink]="kpi.link" class="kpi-card">
            <div class="kpi-top">
              <div class="kpi-icon" [class]="kpi.iconClass">{{ kpi.emoji }}</div>
              <span class="kpi-arrow">›</span>
            </div>
            <div class="kpi-value">{{ kpi.value }}</div>
            <div class="kpi-label">{{ kpi.label }}</div>
          </a>
        }
      </div>

      <!-- Alert Row -->
      <div class="alert-row">
        <a routerLink="../inventory" class="alert-card" [class.danger]="stats().expiryAlerts > 0" [class.safe]="stats().expiryAlerts === 0">
          <div class="alert-head"><span>⚠</span><span>{{ t('expiryAlert') }}</span></div>
          <div class="alert-num">{{ stats().expiryAlerts }}</div>
          <div class="alert-sub">{{ tl('materials expiring < 30 days', 'vật tư hết hạn < 30 ngày', '物料效期 < 30天') }}</div>
        </a>

        <a routerLink="../inventory" class="alert-card warn">
          <div class="alert-head"><span>🕐</span><span>{{ t('agedStock') }}</span></div>
          <div class="alert-num">{{ stats().agedCount }}</div>
          <div class="alert-sub">{{ tl('finished goods > 2 months', 'lô thành phẩm tồn > 2 tháng', '庫存超2個月批次') }}</div>
        </a>

        <a routerLink="../schedule" class="alert-card" [class.info]="achievement >= 80" [class.warn-soft]="achievement < 80">
          <div class="alert-head"><span>📈</span><span>{{ t('achievement') }}</span></div>
          <div class="alert-num" [class.text-info]="achievement >= 80" [class.text-warn]="achievement < 80">
            {{ todayPlanned > 0 ? achievement + '%' : '—' }}
          </div>
          <div class="alert-sub">
            {{ tl('', '', '今日 ') + todayActual.toLocaleString() + ' / ' + todayPlanned.toLocaleString() + tl(' kg today', ' kg hôm nay', ' 公斤') }}
          </div>
          @if (todayPlanned > 0) {
            <div class="progress-bar">
              <div class="progress-fill" [class.fill-info]="achievement >= 80" [class.fill-warn]="achievement < 80" [style.width.%]="achievement > 100 ? 100 : achievement"></div>
            </div>
          }
        </a>
      </div>

      <!-- Weekly Chart (SVG) -->
      <div class="chart-row">
        <div class="chart-card wide">
          <h4>{{ tl('Weekly Output (kg)', 'Sản Lượng Tuần Này (kg)', '本週生產量 (公斤)') }}</h4>
          <div class="bar-chart">
            @for (d of weekData; track d.day) {
              <div class="bar-group">
                <div class="bars">
                  <div class="bar planned" [style.height.%]="(d.planned / maxWeek) * 100" [title]="'Kế hoạch: ' + d.planned + ' kg'"></div>
                  @if (d.actual !== undefined) {
                    <div class="bar actual" [style.height.%]="(d.actual / maxWeek) * 100" [title]="'Thực tế: ' + d.actual + ' kg'"></div>
                  }
                </div>
                <div class="bar-label">{{ d.day }}</div>
              </div>
            }
            <div class="bar-legend">
              <span class="legend-planned">{{ t('planned') }}</span>
              <span class="legend-actual">{{ t('actual') }}</span>
            </div>
          </div>
        </div>

        <!-- Pie chart: order status -->
        <div class="chart-card">
          <h4>{{ tl('Order Status Distribution', 'Đơn Hàng Theo Trạng Thái', '訂單狀態分佈') }}</h4>
          <div class="pie-container">
            <svg viewBox="0 0 120 120" class="pie-svg">
              @for (slice of pieSlices; track slice.label; let i = $index) {
                <path [attr.d]="slice.path" [attr.fill]="slice.color" />
              }
              <circle cx="60" cy="60" r="28" fill="var(--pie-center, #fff)" />
              <text x="60" y="64" text-anchor="middle" font-size="14" font-weight="bold" fill="var(--shell-text, #17233b)">{{ stats().orders.total }}</text>
            </svg>
            <div class="pie-legend">
              @for (slice of pieSlices; track slice.label) {
                <div class="pie-item">
                  <span class="pie-dot" [style.background]="slice.color"></span>
                  <span>{{ slice.label }}</span>
                  <span class="pie-val">{{ slice.value }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Active Orders Table -->
      <div class="orders-card">
        <div class="orders-head">
          <h4>{{ tl('Active Orders', 'Đơn Hàng Đang Xử Lý', '處理中訂單') }}</h4>
          <a routerLink="../orders" class="see-all">{{ tl('View all ›', 'Xem tất cả ›', '查看全部 ›') }}</a>
        </div>
        <div class="table-wrap">
          <table class="p-table">
            <thead>
              <tr>
                <th>{{ t('orderCode') }}</th>
                <th>{{ t('product') }}</th>
                <th>{{ t('region') }}</th>
                <th class="right">{{ t('qty') }}</th>
                <th class="right">{{ t('deliveryDate') }}</th>
                <th>{{ t('status') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (o of activeOrders; track o.id) {
                <tr>
                  <td class="mono blue">{{ o.vnCode }}</td>
                  <td>
                    <span class="line-badge" [class]="LINE_CSS[o.productLine]">{{ o.productLine }}</span>
                    <span class="prod-name">{{ tl(o.productName, o.productName, o.productNameZH) }}</span>
                  </td>
                  <td class="muted">{{ o.region }}</td>
                  <td class="right bold">{{ o.qty.toLocaleString() }}</td>
                  <td class="right muted">{{ o.deliveryDate }}</td>
                  <td><span class="status-badge" [class]="STATUS_CSS[o.status]">{{ t(o.status) }}</span></td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="empty">{{ tl('No active orders', 'Không có đơn đang xử lý', '目前無處理中訂單') }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .dash { display: flex; flex-direction: column; gap: 18px; }
    .dash-header { display: flex; align-items: center; justify-content: space-between; }
    .dash-header h3 { font-size: 1.2rem; font-weight: 700; color: var(--shell-text, #17233b); margin: 0; }
    .dash-header p { font-size: .78rem; color: var(--muted, #64748b); margin: 3px 0 0; }

    /* KPI */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    @media (max-width: 700px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    .kpi-card { background: var(--card-bg, #fff); border: 1px solid var(--card-border, #e2e8f0); border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.05); cursor: pointer; display: block; padding: 16px; text-decoration: none; transition: box-shadow .15s; }
    .kpi-card:hover { box-shadow: 0 6px 18px rgba(0,0,0,.1); }
    .kpi-top { align-items: center; display: flex; justify-content: space-between; margin-bottom: 10px; }
    .kpi-icon { border-radius: 8px; font-size: 1.1rem; height: 36px; line-height: 36px; text-align: center; width: 36px; }
    .kpi-icon.blue { background: #3b82f6; } .kpi-icon.yellow { background: #eab308; } .kpi-icon.orange { background: #f97316; } .kpi-icon.green { background: #22c55e; }
    .kpi-arrow { color: var(--muted, #94a3b8); font-size: 1.2rem; }
    .kpi-value { color: var(--shell-text, #1e293b); font-size: 1.8rem; font-weight: 800; line-height: 1; }
    .kpi-label { color: var(--muted, #64748b); font-size: .75rem; margin-top: 5px; }

    /* Alerts */
    .alert-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 700px) { .alert-row { grid-template-columns: 1fr; } }
    .alert-card { border: 1px solid; border-radius: 12px; cursor: pointer; display: block; padding: 14px; text-decoration: none; transition: box-shadow .15s; }
    .alert-card:hover { box-shadow: 0 6px 14px rgba(0,0,0,.1); }
    .alert-card.danger { background: #fff1f2; border-color: #fecaca; }
    .alert-card.safe { background: #f0fdf4; border-color: #bbf7d0; }
    .alert-card.warn { background: #fff7ed; border-color: #fed7aa; }
    .alert-card.info { background: #eff6ff; border-color: #bfdbfe; }
    .alert-card.warn-soft { background: #fefce8; border-color: #fef08a; }
    .alert-head { align-items: center; display: flex; font-size: .8rem; font-weight: 600; gap: 6px; color: var(--shell-text, #374151); margin-bottom: 6px; }
    .alert-num { color: var(--shell-text, #111827); font-size: 1.8rem; font-weight: 800; line-height: 1; }
    .text-info { color: #1d4ed8; } .text-warn { color: #a16207; }
    .alert-sub { font-size: .71rem; color: var(--muted, #6b7280); margin-top: 3px; }
    .progress-bar { background: rgba(255,255,255,.6); border-radius: 99px; height: 5px; margin-top: 8px; overflow: hidden; }
    .progress-fill { border-radius: 99px; height: 100%; transition: width .3s; }
    .fill-info { background: #3b82f6; } .fill-warn { background: #eab308; }

    /* Charts */
    .chart-row { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; }
    @media (max-width: 700px) { .chart-row { grid-template-columns: 1fr; } }
    .chart-card { background: var(--card-bg, #fff); border: 1px solid var(--card-border, #e2e8f0); border-radius: 12px; padding: 16px; }
    .chart-card h4 { color: var(--shell-text, #374151); font-size: .82rem; font-weight: 600; margin: 0 0 14px; }
    .bar-chart { align-items: flex-end; display: flex; gap: 8px; height: 180px; padding-bottom: 24px; position: relative; }
    .bar-group { align-items: flex-end; display: flex; flex: 1; flex-direction: column; gap: 2px; height: 100%; justify-content: flex-end; position: relative; }
    .bars { align-items: flex-end; display: flex; gap: 2px; height: calc(100% - 20px); width: 100%; }
    .bar { border-radius: 4px 4px 0 0; min-height: 2px; transition: height .3s; width: 50%; }
    .bar.planned { background: #cbd5e1; } .bar.actual { background: #3b82f6; }
    .bar-label { bottom: 0; color: var(--muted, #64748b); font-size: .7rem; position: absolute; text-align: center; width: 100%; }
    .bar-legend { bottom: -28px; display: flex; gap: 12px; left: 0; position: absolute; }
    .legend-planned::before { background: #cbd5e1; border-radius: 2px; content: ''; display: inline-block; height: 8px; margin-right: 4px; width: 12px; }
    .legend-actual::before { background: #3b82f6; border-radius: 2px; content: ''; display: inline-block; height: 8px; margin-right: 4px; width: 12px; }
    .legend-planned, .legend-actual { color: var(--muted, #64748b); font-size: .7rem; }
    .pie-container { align-items: center; display: flex; gap: 16px; }
    .pie-svg { flex-shrink: 0; width: 110px; }
    .pie-legend { display: flex; flex-direction: column; gap: 6px; }
    .pie-item { align-items: center; display: flex; font-size: .72rem; gap: 6px; color: var(--muted, #374151); }
    .pie-dot { border-radius: 50%; flex-shrink: 0; height: 8px; width: 8px; }
    .pie-val { color: var(--shell-text, #111827); font-weight: 700; margin-left: auto; padding-left: 8px; }

    /* Orders table */
    .orders-card { background: var(--card-bg, #fff); border: 1px solid var(--card-border, #e2e8f0); border-radius: 12px; overflow: hidden; }
    .orders-head { align-items: center; display: flex; justify-content: space-between; padding: 14px 16px; }
    .orders-head h4 { color: var(--shell-text, #374151); font-size: .85rem; font-weight: 600; margin: 0; }
    .see-all { color: #2563eb; font-size: .75rem; text-decoration: none; }
    .see-all:hover { text-decoration: underline; }
    .table-wrap { overflow-x: auto; }
    .p-table { border-collapse: collapse; font-size: .8rem; width: 100%; }
    .p-table thead tr { background: var(--th-bg, #f8fafc); border-bottom: 1px solid var(--card-border, #e2e8f0); }
    .p-table th { color: var(--muted, #64748b); font-size: .71rem; font-weight: 600; padding: 10px 14px; text-align: left; }
    .p-table td { border-bottom: 1px solid var(--card-border, #f1f5f9); padding: 9px 14px; color: var(--shell-text, #374151); }
    .p-table tr:last-child td { border-bottom: none; }
    .p-table tr:hover td { background: var(--row-hover, #f8fafc); }
    .right { text-align: right; }
    .bold { font-weight: 600; }
    .mono { font-family: monospace; font-size: .75rem; }
    .blue { color: #2563eb; }
    .muted { color: var(--muted, #6b7280); }
    .empty { color: var(--muted, #9ca3af); padding: 24px; text-align: center; }
    .line-badge { border-radius: 4px; font-size: .65rem; font-weight: 700; margin-right: 6px; padding: 2px 6px; color: #fff; }
    .line-av { background: #22c55e; } .line-nd { background: #3b82f6; } .line-gv { background: #f97316; }
    .prod-name { font-size: .78rem; color: var(--shell-text, #374151); }
    .status-badge { border-radius: 999px; font-size: .68rem; font-weight: 600; padding: 3px 8px; }
    .status-ch { background: #f1f5f9; color: #475569; } .status-dl { background: #dbeafe; color: #1d4ed8; }
    .status-tk { background: #fef9c3; color: #a16207; } .status-cx { background: #ffedd5; color: #c2410c; }
    .status-dx { background: #dcfce7; color: #15803d; } .status-hu { background: #fee2e2; color: #991b1b; }
    .status-ng { background: #fee2e2; color: #991b1b; } .status-xn { background: #f3e8ff; color: #7e22ce; }
    .status-hm { background: #e0e7ff; color: #3730a3; }

    :host-context(.dark-theme) .kpi-card,
    :host-context(.dark-theme) .chart-card,
    :host-context(.dark-theme) .orders-card { background: #172033; border-color: #334155; }
    :host-context(.dark-theme) .kpi-value,
    :host-context(.dark-theme) .dash-header h3 { color: #f1f5f9; }
    :host-context(.dark-theme) .p-table thead tr { background: #1e293b; }
    :host-context(.dark-theme) .p-table td { border-color: #334155; color: #cbd5e1; }
    :host-context(.dark-theme) .p-table tr:hover td { background: #1e293b; }
    :host-context(.dark-theme) .pie-svg circle { fill: #172033; }
    :host-context(.dark-theme) .pie-svg text { fill: #f1f5f9; }
    :host-context(.dark-theme) .bar-label,
    :host-context(.dark-theme) .legend-planned,
    :host-context(.dark-theme) .legend-actual { color: #94a3b8; }

    /* Alert cards – dark mode: tối nền, giữ màu sắc đặc trưng */
    :host-context(.dark-theme) .alert-card.danger   { background: #2d0a0a; border-color: #7f1d1d; }
    :host-context(.dark-theme) .alert-card.safe     { background: #052e16; border-color: #14532d; }
    :host-context(.dark-theme) .alert-card.warn     { background: #1c0e00; border-color: #7c2d12; }
    :host-context(.dark-theme) .alert-card.info     { background: #0c1a3f; border-color: #1e3a5f; }
    :host-context(.dark-theme) .alert-card.warn-soft { background: #1c1a00; border-color: #713f12; }
    :host-context(.dark-theme) .alert-head { color: #e2e8f0; }
    :host-context(.dark-theme) .alert-num  { color: #f8fafc; }
    :host-context(.dark-theme) .alert-sub  { color: #94a3b8; }
    :host-context(.dark-theme) .text-warn  { color: #fbbf24; }
    :host-context(.dark-theme) .text-info  { color: #60a5fa; }
    :host-context(.dark-theme) .progress-bar { background: rgba(255,255,255,.1); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningDashboardComponent {
  protected readonly LINE_CSS = LINE_CSS;
  protected readonly STATUS_CSS = STATUS_CSS;

  private readonly lang = inject(LanguageService);
  private readonly svc = inject(PlanningService);

  t(key: string): string { return this.lang.translate(key); }
  tl(en: string, vi: string, zh: string): string {
    const l = this.lang.language();
    return l === 'vi' ? vi : l === 'zh-TW' ? zh : en;
  }
  get locale(): string {
    const l = this.lang.language();
    return l === 'vi' ? 'vi-VN' : l === 'zh-TW' ? 'zh-TW' : 'en-US';
  }

  get isVi(): boolean { return this.lang.language() === 'vi'; }
  get stats() { return this.svc.stats; }
  get todayStr(): string { return new Date().toLocaleDateString(this.locale); }
  get todayPlanned(): number { return this.svc.stats().todayPlan.planned; }
  get todayActual(): number  { return this.svc.stats().todayPlan.actual; }
  get achievement(): number  { return this.todayPlanned > 0 ? Math.round((this.todayActual / this.todayPlanned) * 100) : 0; }

  get activeOrders(): Order[] {
    return this.svc.orders().filter(o => ['DL', 'CX', 'XN'].includes(o.status)).slice(0, 8);
  }

  readonly weekData = [
    { day: 'T2', planned: 9000, actual: 8850 as number | undefined },
    { day: 'T3', planned: 8500, actual: 8200 as number | undefined },
    { day: 'T4', planned: 9500, actual: 7800 as number | undefined },
    { day: 'T5', planned: 9000, actual: undefined as number | undefined },
    { day: 'T6', planned: 8000, actual: undefined as number | undefined },
    { day: 'T7', planned: 5000, actual: undefined as number | undefined },
  ];
  get maxWeek(): number { return 10000; }

  get kpis() {
    const s = this.svc.stats();
    return [
      { label: this.t('planTotalOrders'),   value: s.orders.total,        iconClass: 'blue',   emoji: '🛒', link: '../orders' },
      { label: this.t('planInProduction'),  value: s.orders.inProduction, iconClass: 'yellow', emoji: '🏭', link: '../schedule' },
      { label: this.t('planReadyToShip'),   value: s.orders.readyToShip,  iconClass: 'orange', emoji: '🚛', link: '../orders' },
      { label: this.t('planShipped'),       value: s.orders.shipped,      iconClass: 'green',  emoji: '📦', link: '../orders' },
    ];
  }

  get pieSlices() {
    const s = this.svc.stats().orders;
    const entries = [
      { label: this.t('CH'), value: s.pending,       color: '#94a3b8' },
      { label: this.t('DL'), value: s.inProduction,  color: '#3b82f6' },
      { label: this.t('CX'), value: s.readyToShip,   color: '#f97316' },
      { label: this.t('DX'), value: s.shipped,       color: '#22c55e' },
    ].filter(e => e.value > 0);

    const total = entries.reduce((s, e) => s + e.value, 0);
    if (total === 0) return [];

    let angle = -Math.PI / 2;
    return entries.map(e => {
      const sweep = (e.value / total) * 2 * Math.PI;
      const x1 = 60 + 46 * Math.cos(angle);
      const y1 = 60 + 46 * Math.sin(angle);
      angle += sweep;
      const x2 = 60 + 46 * Math.cos(angle);
      const y2 = 60 + 46 * Math.sin(angle);
      const large = sweep > Math.PI ? 1 : 0;
      return { ...e, path: `M60,60 L${x1},${y1} A46,46 0 ${large},1 ${x2},${y2} Z` };
    });
  }
}
