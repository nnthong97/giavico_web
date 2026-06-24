import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/i18n/language.service';
import { PlanningService } from '../data-access/planning.service';
import { Material } from '../models/planning.model';

type TabKey = 'all' | 'raw' | 'semi' | 'auxiliary' | 'finished';
type SortKey = 'expiry' | 'stock' | 'name';
type RiskLevel = 'expired' | 'danger' | 'warning' | 'safe';

const RISK_CSS: Record<RiskLevel, string> = {
  expired: 'risk-expired', danger: 'risk-danger', warning: 'risk-warning', safe: 'risk-safe',
};

@Component({
  selector: 'app-planning-inventory',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="inv-page">
      <div>
        <h3>{{ tl('Inventory & Materials', 'Quản Lý Tồn Kho & Vật Tư', '庫存與物料管理') }}</h3>
        <p>{{ tl('Sources: Warehouse + SX1 + SX2 + SX4', 'Tổng hợp từ: Kho + SX1 + SX2 + SX4', '彙整自：倉庫 + 生產一 + 生產二 + 生產四') }}</p>
      </div>

      <!-- Alert Summary -->
      <div class="alert-grid">
        @for (a of alertCards; track a.label) {
          <div class="alert-card" [class]="a.css">
            <div class="alert-head"><span>{{ a.icon }}</span><span>{{ a.label }}</span></div>
            <div class="alert-num">{{ a.count }}</div>
            <div class="alert-sub">{{ a.sub }}</div>
          </div>
        }
      </div>

      <!-- Filters -->
      <div class="filter-card">
        <div class="tab-row">
          @for (tb of tabs; track tb.key) {
            <button class="tab-btn" [class.active]="activeTab() === tb.key" (click)="activeTab.set(tb.key)">
              {{ tl(tb.labelEn, tb.labelVi, tb.labelZh) }}
            </button>
          }
        </div>
        <div class="filter-row">
          <div class="search-wrap">
            <span class="search-icon">🔍</span>
            <input class="search-input" [(ngModel)]="search" [placeholder]="tl('Search code or name...', 'Tìm theo mã, tên...', '搜尋碼或名稱...')" />
          </div>
          <select class="sel" [(ngModel)]="sortBy">
            <option value="expiry">{{ tl('Sort: Expiry', 'Sắp xếp: Hạn SD', '排序：效期') }}</option>
            <option value="stock">{{ tl('Sort: Stock', 'Sắp xếp: Tồn kho', '排序：庫存量') }}</option>
            <option value="name">{{ tl('Sort: Name', 'Sắp xếp: Tên', '排序：名稱') }}</option>
          </select>
        </div>
      </div>

      <!-- Table -->
      <div class="table-card">
        @if (sorted().length === 0) {
          <div class="empty">{{ tl('No materials found', 'Không tìm thấy vật tư nào', '找不到物料') }}</div>
        } @else {
          <div class="table-wrap">
            <table class="p-table">
              <thead>
                <tr>
                  <th>{{ t('materialCode') }}</th>
                  <th>{{ t('material') }}</th>
                  <th>{{ t('type') }}</th>
                  <th class="right">{{ t('warehouse') }}</th>
                  <th class="right">{{ t('sx1') }}</th>
                  <th class="right">{{ t('sx2') }}</th>
                  <th class="right">{{ t('sx4') }}</th>
                  <th class="right bold">{{ t('totalStock') }}</th>
                  <th>{{ t('expiryDate') }}</th>
                  <th class="center">{{ t('riskLevel') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (m of sorted(); track m.id) {
                  @let dLeft = getDaysLeft(m.expiryDate);
                  @let risk  = getRisk(dLeft, m.type);
                  @let total = m.stockWarehouse + m.stockSX1 + m.stockSX2 + m.stockSX4;
                  <tr [class.danger-row]="risk === 'danger' || risk === 'expired'">
                    <td>
                      <div class="mono blue">{{ m.codeVN }}</div>
                      <div class="mono muted xs">{{ m.codeTW }}</div>
                    </td>
                    <td>
                      <div class="mat-name">{{ tl(m.nameVN, m.nameVN, m.nameZH) }}</div>
                      <div class="mat-meta">
                        @if (m.origin === 'import') { <span class="badge-import">{{ tl('Import', 'Nhập khẩu', '進口') }}</span> }
                        @if (m.seasonal) { <span class="badge-seasonal">{{ tl('Seasonal', 'Mùa vụ', '季節性') }}</span> }
                        <span class="muted xs">{{ tl('Lead: ', 'Lead: ', '前置:') + m.leadTimeDays + tl('d', 'ngày', '天') }}</span>
                      </div>
                    </td>
                    <td><span class="type-badge" [class]="typeCSS[m.type]">{{ tl(typeLabels[m.type].en, typeLabels[m.type].vi, typeLabels[m.type].zh) }}</span></td>
                    <td class="right">{{ m.stockWarehouse.toLocaleString() }}</td>
                    <td class="right muted">{{ m.stockSX1 > 0 ? m.stockSX1.toLocaleString() : '—' }}</td>
                    <td class="right muted">{{ m.stockSX2 > 0 ? m.stockSX2.toLocaleString() : '—' }}</td>
                    <td class="right muted">{{ m.stockSX4 > 0 ? m.stockSX4.toLocaleString() : '—' }}</td>
                    <td class="right bold">{{ total.toLocaleString() }}</td>
                    <td>
                      <div class="xs">{{ fmtExpiry(m.expiryDate) }}</div>
                      @if (m.expiryDate) {
                        <div class="xs days-left" [class.red]="dLeft < 30">
                          {{ dLeft < 0
                            ? tl('Expired ' + (-dLeft) + 'd ago', 'Hết hạn ' + (-dLeft) + ' ngày', '已逾期' + (-dLeft) + '天')
                            : tl(dLeft + ' days left', 'Còn ' + dLeft + ' ngày', '剩' + dLeft + '天') }}
                        </div>
                      }
                    </td>
                    <td class="center">
                      <span class="risk-badge" [class]="RISK_CSS[risk]">
                        {{ riskLabel(risk) }}
                      </span>
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
    .inv-page { display: flex; flex-direction: column; gap: 14px; }
    h3 { color: var(--shell-text, #17233b); font-size: 1.1rem; font-weight: 700; margin: 0; }
    .inv-page > div:first-child p { color: var(--muted, #6b7280); font-size: .78rem; margin: 3px 0 0; }
    .alert-grid { display: grid; gap: 10px; grid-template-columns: repeat(3, 1fr); }
    @media (max-width: 600px) { .alert-grid { grid-template-columns: 1fr; } }
    .alert-card { border: 1px solid; border-radius: 12px; padding: 12px 14px; }
    .alert-card.danger { background: #fff1f2; border-color: #fecaca; }
    .alert-card.warn   { background: #fff7ed; border-color: #fed7aa; }
    .alert-card.safe   { background: #f0fdf4; border-color: #bbf7d0; }
    .alert-head { align-items: center; display: flex; font-size: .78rem; font-weight: 600; gap: 6px; margin-bottom: 5px; color: var(--shell-text, #374151); }
    .alert-num { font-size: 1.6rem; font-weight: 800; color: var(--shell-text, #111827); }
    .alert-sub { color: var(--muted, #6b7280); font-size: .7rem; margin-top: 2px; }
    .filter-card { background: var(--card-bg, #fff); border: 1px solid var(--card-border, #e2e8f0); border-radius: 12px; padding: 14px; }
    .tab-row { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
    .tab-btn { background: var(--th-bg, #f1f5f9); border: none; border-radius: 8px; color: var(--muted, #64748b); cursor: pointer; font-size: .75rem; font-weight: 600; padding: 6px 12px; white-space: nowrap; }
    .tab-btn.active { background: #2563eb; color: #fff; }
    .tab-btn:hover:not(.active) { background: var(--row-hover, #e2e8f0); }
    .filter-row { display: flex; flex-wrap: wrap; gap: 10px; }
    .search-wrap { flex: 1; min-width: 180px; position: relative; }
    .search-icon { left: 10px; position: absolute; top: 50%; transform: translateY(-50%); }
    .search-input { background: var(--card-bg, #fff); border: 1px solid var(--card-border, #e2e8f0); border-radius: 8px; color: var(--shell-text, #374151); font-size: .82rem; outline: none; padding: 8px 12px 8px 32px; width: 100%; }
    .search-input:focus { border-color: #3b82f6; }
    .sel { background: var(--card-bg, #fff); border: 1px solid var(--card-border, #e2e8f0); border-radius: 8px; color: var(--shell-text, #374151); font-size: .82rem; outline: none; padding: 8px 12px; }
    .table-card { background: var(--card-bg, #fff); border: 1px solid var(--card-border, #e2e8f0); border-radius: 12px; overflow: hidden; }
    .table-wrap { overflow-x: auto; }
    .p-table { border-collapse: collapse; font-size: .78rem; width: 100%; }
    .p-table th { background: var(--th-bg, #f8fafc); border-bottom: 1px solid var(--card-border, #e2e8f0); color: var(--muted, #64748b); font-size: .7rem; font-weight: 600; padding: 10px 12px; text-align: left; }
    .p-table td { border-bottom: 1px solid var(--row-border, #f1f5f9); color: var(--shell-text, #374151); padding: 8px 12px; }
    .p-table tr:hover td { background: var(--row-hover, #f8fafc); }
    .danger-row td { background: rgba(254,226,226,.15); }
    .right { text-align: right; } .center { text-align: center; } .bold { font-weight: 700; }
    .mono { font-family: monospace; font-size: .72rem; } .blue { color: #2563eb; } .muted { color: var(--muted, #6b7280); }
    .xs { font-size: .68rem; } .red { color: #dc2626; font-weight: 600; }
    .days-left { margin-top: 2px; color: var(--muted, #9ca3af); }
    .mat-name { font-size: .78rem; font-weight: 500; color: var(--shell-text, #374151); }
    .mat-meta { align-items: center; display: flex; flex-wrap: wrap; font-size: .65rem; gap: 4px; margin-top: 3px; }
    .badge-import  { background: #e0e7ff; border-radius: 4px; color: #3730a3; padding: 1px 5px; }
    .badge-seasonal { background: #fef3c7; border-radius: 4px; color: #92400e; padding: 1px 5px; }
    .type-badge { border-radius: 6px; font-size: .67rem; font-weight: 600; padding: 2px 7px; }
    .type-raw  { background: #dcfce7; color: #15803d; }
    .type-semi { background: #dbeafe; color: #1d4ed8; }
    .type-aux  { background: #f3e8ff; color: #7e22ce; }
    .type-fin  { background: #ffedd5; color: #c2410c; }
    .risk-badge { border: 1px solid; border-radius: 8px; font-size: .67rem; font-weight: 700; padding: 3px 8px; white-space: nowrap; }
    .risk-expired { background: #fca5a5; border-color: #f87171; color: #7f1d1d; }
    .risk-danger  { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }
    .risk-warning { background: #fef9c3; border-color: #fde047; color: #a16207; }
    .risk-safe    { background: #dcfce7; border-color: #86efac; color: #15803d; }
    .empty { color: var(--muted, #9ca3af); padding: 32px; text-align: center; }

    :host-context(.dark-theme) .filter-card,
    :host-context(.dark-theme) .table-card { background: #172033; border-color: #334155; }
    :host-context(.dark-theme) .search-input,
    :host-context(.dark-theme) .sel { background: #1e293b; border-color: #334155; color: #e2e8f0; }
    :host-context(.dark-theme) .p-table th { background: #1e293b; border-color: #334155; }
    :host-context(.dark-theme) .p-table td { border-color: #334155; color: #cbd5e1; }
    :host-context(.dark-theme) .p-table tr:hover td { background: #1e293b; }
    :host-context(.dark-theme) .tab-btn { background: #334155; color: #94a3b8; }
    :host-context(.dark-theme) .tab-btn:hover:not(.active) { background: #475569; }
    :host-context(.dark-theme) .mat-name { color: #e2e8f0; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningInventoryComponent {
  protected readonly RISK_CSS = RISK_CSS;
  protected readonly tabs = [
    { key: 'all' as TabKey,       labelEn: 'All',         labelVi: 'Tất cả',         labelZh: '全部' },
    { key: 'raw' as TabKey,       labelEn: 'Raw',         labelVi: 'Nguyên liệu',    labelZh: '原料' },
    { key: 'semi' as TabKey,      labelEn: 'Semi',        labelVi: 'Bán thành phẩm', labelZh: '半成品' },
    { key: 'auxiliary' as TabKey, labelEn: 'Auxiliary',   labelVi: 'Phụ liệu',       labelZh: '輔料' },
    { key: 'finished' as TabKey,  labelEn: 'Finished',    labelVi: 'Thành phẩm',     labelZh: '成品' },
  ];
  protected readonly typeLabels: Record<string, { en: string; vi: string; zh: string }> = {
    raw:       { en: 'Raw material', vi: 'Nguyên liệu', zh: '原料' },
    semi:      { en: 'Semi',         vi: 'BTP',         zh: '半成品' },
    auxiliary: { en: 'Auxiliary',    vi: 'Phụ liệu',    zh: '輔料' },
    finished:  { en: 'Finished',     vi: 'Thành phẩm',  zh: '成品' },
  };
  protected readonly typeCSS: Record<string, string> = {
    raw: 'type-raw', semi: 'type-semi', auxiliary: 'type-aux', finished: 'type-fin',
  };

  private readonly lang = inject(LanguageService);
  private readonly svc = inject(PlanningService);

  activeTab = signal<TabKey>('all');
  search    = '';
  sortBy: SortKey = 'expiry';

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

  getDaysLeft(d: string): number { return this.svc.getDaysLeft(d); }
  getRisk(dl: number, type: string): RiskLevel { return this.svc.getRisk(dl, type as any); }

  fmtExpiry(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(this.locale);
  }

  riskLabel(risk: RiskLevel): string {
    const map: Record<RiskLevel, [string, string, string]> = {
      expired: ['EXPIRED',      'HẾT HẠN',       '已過期'],
      danger:  ['⚠ CRITICAL',   '⚠ NGUY HIỂM',   '⚠ 危險'],
      warning: ['Monitor',      'Cần theo dõi',   '需關注'],
      safe:    ['✓ Safe',       '✓ An toàn',      '✓ 安全'],
    };
    return this.tl(map[risk][0], map[risk][1], map[risk][2]);
  }

  sorted(): Material[] {
    const filtered = this.svc.getMaterialsByFilter(this.activeTab(), this.search);
    const lang = this.lang.language();
    return [...filtered].sort((a, b) => {
      if (this.sortBy === 'expiry') return this.getDaysLeft(a.expiryDate) - this.getDaysLeft(b.expiryDate);
      if (this.sortBy === 'stock') return (b.stockWarehouse + b.stockSX1 + b.stockSX2 + b.stockSX4) - (a.stockWarehouse + a.stockSX1 + a.stockSX2 + a.stockSX4);
      const nameA = lang === 'zh-TW' ? a.nameZH : a.nameVN;
      const nameB = lang === 'zh-TW' ? b.nameZH : b.nameVN;
      return nameA.localeCompare(nameB);
    });
  }

  get alertCards() {
    const all = this.svc.materials();
    const danger  = all.filter(m => { const d = this.getDaysLeft(m.expiryDate); const r = this.getRisk(d, m.type); return r === 'danger' || r === 'expired'; });
    const warning = all.filter(m => this.getRisk(this.getDaysLeft(m.expiryDate), m.type) === 'warning');
    const safe    = all.filter(m => this.getRisk(this.getDaysLeft(m.expiryDate), m.type) === 'safe');
    return [
      { icon: '⚠', css: 'danger', count: danger.length,  label: this.tl('Critical / Expired', 'Nguy hiểm / Hết hạn', '危險 / 已過期'), sub: this.tl('materials need urgent action', 'vật tư cần xử lý ngay', '物料需立即處理') },
      { icon: '🕐', css: 'warn',  count: warning.length, label: this.tl('Monitor',             'Cần theo dõi',        '需關注'),        sub: this.tl('expiring in 14–45 days',      'hết hạn trong 14–45 ngày', '14–45天內到期') },
      { icon: '✓',  css: 'safe',  count: safe.length,    label: this.tl('Safe',                'An toàn',             '安全'),          sub: this.tl('materials within date',       'vật tư trong hạn',        '在有效期內的物料') },
    ];
  }
}
