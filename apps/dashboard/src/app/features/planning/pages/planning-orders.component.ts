import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/i18n/language.service';
import { PlanningService } from '../data-access/planning.service';
import { Order, OrderStatus, ProductLine } from '../models/planning.model';

const LINE_CSS: Record<string, string> = { AV: 'line-av', ND: 'line-nd', GV: 'line-gv' };
const STATUS_CSS: Record<string, string> = {
  CH: 'status-ch', DL: 'status-dl', TK: 'status-tk', CX: 'status-cx',
  DX: 'status-dx', HU: 'status-hu', NG: 'status-ng', XN: 'status-xn', HM: 'status-hm',
};

@Component({
  selector: 'app-planning-orders',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="orders-page">
      <div class="page-header">
        <div>
          <h3>{{ isVi ? 'Quản Lý Đơn Hàng' : '訂單管理' }}</h3>
          <p>{{ t('total') }} {{ filtered().length }} {{ t('items') }}</p>
        </div>
        <button class="btn-export">⬇ {{ t('export') }}</button>
      </div>

      <!-- Filters -->
      <div class="filter-card">
        <div class="filter-row">
          <div class="search-wrap">
            <span class="search-icon">🔍</span>
            <input class="search-input" [(ngModel)]="search" [placeholder]="t('search')" />
          </div>
          <select class="sel" [(ngModel)]="filterLine">
            <option value="all">{{ t('allProducts') }}</option>
            @for (l of lines; track l) { <option [value]="l">{{ l }}</option> }
          </select>
          <select class="sel" [(ngModel)]="filterStatus">
            <option value="all">{{ t('allStatus') }}</option>
            @for (s of statuses; track s) { <option [value]="s">{{ t(s) }} ({{ s }})</option> }
          </select>
        </div>
      </div>

      <!-- Summary -->
      <div class="summary-grid">
        <div class="sum-card">
          <div class="sum-val">{{ totalQty.toLocaleString() }} {{ isVi ? 'hộp' : '箱' }}</div>
          <div class="sum-label">{{ isVi ? 'Tổng SL đặt hàng' : '總訂購量' }}</div>
        </div>
        <div class="sum-card blue">
          <div class="sum-val">{{ totalProduced.toLocaleString() }} {{ isVi ? 'hộp' : '箱' }}</div>
          <div class="sum-label">{{ isVi ? 'Đã sản xuất' : '已生產' }}</div>
        </div>
        <div class="sum-card green">
          <div class="sum-val">{{ totalShipped.toLocaleString() }} {{ isVi ? 'hộp' : '箱' }}</div>
          <div class="sum-label">{{ isVi ? 'Đã xuất hàng' : '已出貨' }}</div>
        </div>
      </div>

      <!-- Table -->
      <div class="table-card">
        @if (filtered().length === 0) {
          <div class="empty">{{ isVi ? 'Không tìm thấy đơn hàng nào' : '找不到符合條件的訂單' }}</div>
        } @else {
          <div class="table-wrap">
            <table class="p-table">
              <thead>
                <tr>
                  <th>{{ t('orderCode') }}</th>
                  <th>{{ t('twCode') }}</th>
                  <th>{{ t('product') }}</th>
                  <th>{{ t('customer') }}</th>
                  <th>{{ t('region') }}</th>
                  <th class="right">{{ t('qty') }}</th>
                  <th class="right">{{ t('qtyProduced') }}</th>
                  <th class="right">{{ t('deliveryDate') }}</th>
                  <th>{{ t('status') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (o of filtered(); track o.id) {
                  <tr [class.danger-row]="o.note">
                    <td class="mono blue">{{ o.vnCode }}</td>
                    <td class="mono muted">{{ o.twCode || '—' }}</td>
                    <td>
                      <div class="prod-cell">
                        <span class="line-badge" [class]="LINE_CSS[o.productLine]">{{ o.productLine }}</span>
                        <div>
                          <div class="prod-name">{{ isVi ? o.productName : o.productNameZH }}</div>
                          <div class="prod-code">{{ o.productCodeTW }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="muted">{{ o.customer }}</td>
                    <td><span class="region-badge">{{ o.region }}</span></td>
                    <td class="right bold">{{ o.qty.toLocaleString() }}</td>
                    <td class="right">
                      <div class="blue">{{ o.qtyProduced.toLocaleString() }}</div>
                      <div class="progress-bar">
                        <div class="progress-fill" [style.width.%]="o.qty > 0 ? (o.qtyProduced / o.qty * 100) : 0"></div>
                      </div>
                    </td>
                    <td class="right muted">{{ o.deliveryDate }}</td>
                    <td>
                      <div class="status-stack">
                        <span class="status-badge" [class]="STATUS_CSS[o.status]">{{ t(o.status) }}</span>
                        @if (o.note) { <span class="note-badge">⚠ {{ o.note }}</span> }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .orders-page { display: flex; flex-direction: column; gap: 14px; }
    .page-header { align-items: center; display: flex; justify-content: space-between; }
    h3 { font-size: 1.1rem; font-weight: 700; color: var(--shell-text, #17233b); margin: 0; }
    .page-header p { color: var(--muted, #6b7280); font-size: .78rem; margin: 3px 0 0; }
    .btn-export { align-items: center; background: #16a34a; border: none; border-radius: 8px; color: #fff; cursor: pointer; display: flex; font-size: .8rem; font-weight: 600; gap: 6px; padding: 8px 14px; }
    .btn-export:hover { background: #15803d; }
    .filter-card { background: var(--card-bg, #fff); border: 1px solid var(--card-border, #e2e8f0); border-radius: 12px; padding: 14px; }
    .filter-row { display: flex; flex-wrap: wrap; gap: 10px; }
    .search-wrap { flex: 1; min-width: 180px; position: relative; }
    .search-icon { left: 10px; position: absolute; top: 50%; transform: translateY(-50%); }
    .search-input { border: 1px solid var(--card-border, #e2e8f0); border-radius: 8px; font-size: .82rem; outline: none; padding: 8px 12px 8px 32px; width: 100%; background: var(--card-bg, #fff); color: var(--shell-text, #374151); }
    .search-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,.2); }
    .sel { background: var(--card-bg, #fff); border: 1px solid var(--card-border, #e2e8f0); border-radius: 8px; color: var(--shell-text, #374151); font-size: .82rem; outline: none; padding: 8px 12px; }
    .sel:focus { border-color: #3b82f6; }
    .summary-grid { display: grid; gap: 10px; grid-template-columns: repeat(3, 1fr); }
    @media (max-width: 600px) { .summary-grid { grid-template-columns: 1fr; } }
    .sum-card { background: var(--card-bg, #fff); border: 1px solid var(--card-border, #e2e8f0); border-radius: 12px; padding: 12px 16px; text-align: center; }
    .sum-val { color: var(--shell-text, #111827); font-size: 1.15rem; font-weight: 700; }
    .sum-card.blue .sum-val { color: #2563eb; }
    .sum-card.green .sum-val { color: #16a34a; }
    .sum-label { color: var(--muted, #6b7280); font-size: .72rem; margin-top: 3px; }
    .table-card { background: var(--card-bg, #fff); border: 1px solid var(--card-border, #e2e8f0); border-radius: 12px; overflow: hidden; }
    .table-wrap { overflow-x: auto; }
    .p-table { border-collapse: collapse; font-size: .8rem; width: 100%; }
    .p-table th { background: var(--th-bg, #f8fafc); border-bottom: 1px solid var(--card-border, #e2e8f0); color: var(--muted, #64748b); font-size: .71rem; font-weight: 600; padding: 10px 14px; text-align: left; }
    .p-table td { border-bottom: 1px solid var(--row-border, #f1f5f9); color: var(--shell-text, #374151); padding: 9px 14px; }
    .p-table tr:hover td { background: var(--row-hover, #f8fafc); }
    .danger-row td { background: rgba(254,226,226,.15); }
    .right { text-align: right; } .bold { font-weight: 600; }
    .mono { font-family: monospace; font-size: .74rem; } .blue { color: #2563eb; } .muted { color: var(--muted, #6b7280); }
    .prod-cell { align-items: center; display: flex; gap: 8px; }
    .line-badge { border-radius: 4px; color: #fff; flex-shrink: 0; font-size: .64rem; font-weight: 700; padding: 2px 5px; }
    .line-av { background: #22c55e; } .line-nd { background: #3b82f6; } .line-gv { background: #f97316; }
    .prod-name { font-size: .78rem; font-weight: 500; color: var(--shell-text, #374151); }
    .prod-code { color: var(--muted, #9ca3af); font-family: monospace; font-size: .67rem; }
    .region-badge { background: var(--th-bg, #f1f5f9); border-radius: 6px; color: var(--muted, #64748b); font-size: .72rem; padding: 2px 7px; }
    .progress-bar { background: var(--row-border, #e2e8f0); border-radius: 99px; height: 3px; margin-top: 3px; width: 100%; overflow: hidden; }
    .progress-fill { background: #3b82f6; border-radius: 99px; height: 100%; transition: width .3s; }
    .status-stack { display: flex; flex-direction: column; gap: 3px; }
    .status-badge { border-radius: 999px; font-size: .67rem; font-weight: 600; padding: 2px 7px; display: inline-block; }
    .status-ch { background: #f1f5f9; color: #475569; } .status-dl { background: #dbeafe; color: #1d4ed8; }
    .status-tk { background: #fef9c3; color: #a16207; } .status-cx { background: #ffedd5; color: #c2410c; }
    .status-dx { background: #dcfce7; color: #15803d; } .status-hu { background: #fee2e2; color: #991b1b; }
    .status-ng { background: #fee2e2; color: #991b1b; } .status-xn { background: #f3e8ff; color: #7e22ce; }
    .status-hm { background: #e0e7ff; color: #3730a3; }
    .note-badge { background: #fffbeb; border-radius: 4px; color: #92400e; font-size: .66rem; padding: 2px 5px; }
    .empty { color: var(--muted, #9ca3af); padding: 32px; text-align: center; }

    :host-context(.dark-theme) .filter-card,
    :host-context(.dark-theme) .sum-card,
    :host-context(.dark-theme) .table-card { background: #172033; border-color: #334155; }
    :host-context(.dark-theme) .search-input,
    :host-context(.dark-theme) .sel { background: #1e293b; border-color: #334155; color: #e2e8f0; }
    :host-context(.dark-theme) .p-table th { background: #1e293b; border-color: #334155; }
    :host-context(.dark-theme) .p-table td { border-color: #334155; color: #cbd5e1; }
    :host-context(.dark-theme) .p-table tr:hover td { background: #1e293b; }
    :host-context(.dark-theme) .region-badge { background: #334155; color: #94a3b8; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningOrdersComponent {
  protected readonly LINE_CSS = LINE_CSS;
  protected readonly STATUS_CSS = STATUS_CSS;
  protected readonly lines: ProductLine[] = ['AV', 'ND', 'GV'];
  protected readonly statuses: OrderStatus[] = ['CH', 'DL', 'TK', 'CX', 'DX', 'HU', 'NG', 'XN', 'HM'];

  private readonly lang = inject(LanguageService);
  private readonly svc = inject(PlanningService);

  search = '';
  filterLine = 'all';
  filterStatus = 'all';

  t(key: string): string { return this.lang.translate(key); }
  get isVi(): boolean { return this.lang.language() === 'vi'; }

  filtered(): Order[] {
    return this.svc.getOrdersByFilter(this.filterLine, this.filterStatus, this.search);
  }

  get totalQty():      number { return this.filtered().reduce((s, o) => s + o.qty, 0); }
  get totalProduced(): number { return this.filtered().reduce((s, o) => s + o.qtyProduced, 0); }
  get totalShipped():  number { return this.filtered().filter(o => o.status === 'DX').reduce((s, o) => s + o.qtyProduced, 0); }
}
