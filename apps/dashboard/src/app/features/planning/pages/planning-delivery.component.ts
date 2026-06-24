import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/i18n/language.service';
import { PlanningService } from '../data-access/planning.service';
import { Product } from '../models/planning.model';
import { PLANNING_PRODUCTS, PLANNING_INVENTORY } from '../data/planning-mock.data';

interface AnalysisResult {
  materialReady: string;
  machineReady: string;
  productionDays: number;
  qaDays: number;
  logisticsDays: number;
  earliestDelivery: string;
  feasible: boolean;
  bottleneck: string;
  materialStatus: 'available' | 'partial' | 'need-purchase';
  materialShortfall: number;
}

@Component({
  selector: 'app-planning-delivery',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="del-page">
      <div class="page-header">
        <h3>{{ t('checkDelivery') }}</h3>
        <p>{{ isVi
          ? 'Nhập thông tin đơn hàng → hệ thống tự phân tích tất cả ràng buộc và tính ngày giao sớm nhất'
          : '輸入訂單資訊 → 系統自動分析所有限制條件並計算最早交期' }}</p>
      </div>

      <div class="calc-grid">
        <!-- Input Panel -->
        <div class="input-card">
          <h4>🧮 {{ isVi ? 'Thông Tin Đơn Hàng' : '訂單資訊' }}</h4>

          <div class="field">
            <label>{{ t('selectProduct') }}</label>
            <select class="sel" [(ngModel)]="productCode">
              <option value="">{{ isVi ? '— Chọn sản phẩm —' : '— 請選擇產品 —' }}</option>
              @for (line of ['AV', 'ND', 'GV']; track line) {
                <optgroup [label]="line + ' – ' + (line === 'AV' ? 'Nha Đam/蘆薈' : line === 'ND' ? 'Thạch Dừa/椰果' : 'Nước Trái Cây/果汁')">
                  @for (p of products.filter(x => x.line === line); track p.code) {
                    <option [value]="p.code">{{ isVi ? p.nameVN : p.nameZH }} – {{ p.code }}</option>
                  }
                </optgroup>
              }
            </select>
          </div>

          @if (selectedProduct) {
            <div class="product-info">
              <div class="info-row"><span>{{ isVi ? 'Mã TW:' : '台灣碼:' }}</span><span class="mono">{{ selectedProduct.codeTW }}</span></div>
              <div class="info-row"><span>{{ isVi ? 'Hiệu suất:' : '良率:' }}</span><span>{{ (selectedProduct.yieldRate * 100).toFixed(0) }}%</span></div>
              <div class="info-row"><span>{{ isVi ? 'Hao hụt:' : '損耗:' }}</span><span>{{ selectedProduct.wastageKg }} kg/lô</span></div>
              <div class="info-row"><span>{{ isVi ? 'Máy:' : '機台:' }}</span><span>{{ selectedProduct.machineRequired }}</span></div>
              <div class="info-row"><span>QA:</span><span>{{ selectedProduct.qaDays }} {{ isVi ? 'ngày' : '天' }}</span></div>
            </div>
          }

          <div class="field">
            <label>{{ t('enterQty') }}</label>
            <input type="number" class="inp" [(ngModel)]="qty" placeholder="5000" min="1" />
          </div>

          <div class="field">
            <label>{{ t('requestedDate') }}</label>
            <input type="date" class="inp" [(ngModel)]="requestedDate" [min]="todayStr" />
          </div>

          <button class="calc-btn" [disabled]="!productCode || !qty || !requestedDate" (click)="calculate()">
            🧮 {{ t('calculate') }}
          </button>
        </div>

        <!-- Result Panel -->
        <div class="result-col">
          @if (result()) {
            @let r = result()!;

            <!-- Verdict -->
            <div class="verdict-card" [class.feasible]="r.feasible" [class.not-feasible]="!r.feasible">
              <div class="verdict-top">
                <span class="verdict-icon">{{ r.feasible ? '✅' : '❌' }}</span>
                <div>
                  <div class="verdict-label">{{ r.feasible ? t('feasible') : t('notFeasible') }}</div>
                  <div class="verdict-date">
                    {{ t('earliestDate') }}: <strong>{{ fmtFull(r.earliestDelivery) }}</strong>
                  </div>
                  @if (requestedDate) {
                    <div class="verdict-req">{{ isVi ? 'Yêu cầu:' : '要求:' }} {{ fmtFull(requestedDate) }}</div>
                  }
                </div>
              </div>
              @if (r.bottleneck) {
                <div class="bottleneck-box">
                  <span>⚠</span>
                  <div><strong>{{ t('bottleneck') }}:</strong> {{ r.bottleneck }}</div>
                </div>
              }
            </div>

            <!-- Timeline Breakdown -->
            <div class="timeline-card">
              <h5>{{ isVi ? 'Phân Tích Từng Ràng Buộc' : '各限制條件分析' }}</h5>
              <div class="timeline">
                @for (step of timelineSteps(r); track step.label) {
                  <div class="tl-step">
                    <div class="tl-dot" [class]="step.dotClass"></div>
                    <div class="tl-body">
                      <div class="tl-head">
                        <span class="tl-label">{{ step.label }}</span>
                        <span class="tl-date">{{ fmtShort(step.date) }}</span>
                      </div>
                      <div class="tl-value" [class]="step.valueClass">{{ step.value }}</div>
                    </div>
                  </div>
                }
              </div>
              <div class="tl-final">
                › <strong>{{ t('earliestDate') }}:</strong>
                <span [class.green]="r.feasible" [class.red]="!r.feasible">{{ fmtFull(r.earliestDelivery) }}</span>
              </div>
            </div>

            @if (r.materialShortfall > 0) {
              <div class="shortfall-card">
                <div class="sf-title">⚠ {{ isVi ? 'Chi Tiết Thiếu Nguyên Liệu' : '原料不足明細' }}</div>
                <div class="sf-body">
                  <div>{{ isVi ? 'Cần: ' + neededRaw().toFixed(0) + ' kg nguyên liệu thô' : '需要:' + neededRaw().toFixed(0) + '公斤原料' }}</div>
                  <div>{{ isVi ? 'Cần mua thêm: ' + r.materialShortfall.toFixed(0) + ' kg' : '需補購:' + r.materialShortfall.toFixed(0) + '公斤' }}</div>
                </div>
              </div>
            }

          } @else {
            <div class="empty-result">
              <div class="empty-icon">🧮</div>
              <p>{{ isVi
                ? 'Chọn sản phẩm, nhập số lượng và ngày giao để bắt đầu phân tích'
                : '請選擇產品、輸入數量和交期後開始分析' }}</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .del-page { display: flex; flex-direction: column; gap: 16px; max-width: 1100px; }
    h3 { color: var(--shell-text, #17233b); font-size: 1.1rem; font-weight: 700; margin: 0; }
    .page-header p { color: var(--muted, #6b7280); font-size: .78rem; margin: 4px 0 0; }
    .calc-grid { display: grid; gap: 16px; grid-template-columns: 1fr 1.4fr; }
    @media (max-width: 750px) { .calc-grid { grid-template-columns: 1fr; } }

    .input-card { background: var(--card-bg, #fff); border: 1px solid var(--card-border, #e2e8f0); border-radius: 12px; display: flex; flex-direction: column; gap: 14px; padding: 18px; }
    .input-card h4 { color: var(--shell-text, #374151); font-size: .88rem; font-weight: 700; margin: 0; }
    .field label { color: var(--muted, #64748b); display: block; font-size: .75rem; font-weight: 600; margin-bottom: 6px; }
    .sel, .inp { background: var(--card-bg, #fff); border: 1px solid var(--card-border, #e2e8f0); border-radius: 8px; color: var(--shell-text, #374151); font-size: .82rem; outline: none; padding: 9px 12px; width: 100%; }
    .sel:focus, .inp:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,.2); }
    .product-info { background: var(--th-bg, #f8fafc); border-radius: 8px; display: flex; flex-direction: column; gap: 5px; padding: 10px 12px; }
    .info-row { align-items: center; display: flex; font-size: .75rem; justify-content: space-between; }
    .info-row span:first-child { color: var(--muted, #64748b); }
    .info-row span:last-child { color: var(--shell-text, #374151); font-weight: 600; }
    .mono { font-family: monospace; font-size: .72rem; }
    .calc-btn { align-items: center; background: #2563eb; border: none; border-radius: 8px; color: #fff; cursor: pointer; display: flex; font-size: .85rem; font-weight: 600; gap: 6px; justify-content: center; padding: 10px; transition: background .15s; width: 100%; }
    .calc-btn:hover { background: #1d4ed8; }
    .calc-btn:disabled { background: #94a3b8; cursor: not-allowed; }

    .result-col { display: flex; flex-direction: column; gap: 12px; }

    .verdict-card { border: 2px solid; border-radius: 12px; padding: 16px; }
    .verdict-card.feasible { background: #f0fdf4; border-color: #86efac; }
    .verdict-card.not-feasible { background: #fff1f2; border-color: #fca5a5; }
    .verdict-top { align-items: flex-start; display: flex; gap: 12px; }
    .verdict-icon { font-size: 1.8rem; line-height: 1; }
    .verdict-label { color: var(--shell-text, #111827); font-size: 1.1rem; font-weight: 700; }
    .verdict-card.feasible .verdict-label { color: #166534; }
    .verdict-card.not-feasible .verdict-label { color: #991b1b; }
    .verdict-date { color: var(--shell-text, #374151); font-size: .82rem; margin-top: 4px; }
    .verdict-date strong { font-weight: 700; }
    .verdict-card.feasible .verdict-date strong { color: #166534; }
    .verdict-card.not-feasible .verdict-date strong { color: #991b1b; }
    .verdict-req { color: var(--muted, #6b7280); font-size: .72rem; margin-top: 2px; }
    .bottleneck-box { align-items: flex-start; background: rgba(255,255,255,.6); border-radius: 8px; display: flex; font-size: .75rem; gap: 6px; margin-top: 10px; padding: 8px 10px; color: #991b1b; }

    .timeline-card { background: var(--card-bg, #fff); border: 1px solid var(--card-border, #e2e8f0); border-radius: 12px; padding: 16px; }
    .timeline-card h5 { color: var(--shell-text, #374151); font-size: .82rem; font-weight: 700; margin: 0 0 14px; }
    .timeline { display: flex; flex-direction: column; gap: 10px; }
    .tl-step { align-items: flex-start; display: flex; gap: 10px; }
    .tl-dot { border-radius: 50%; flex-shrink: 0; height: 8px; margin-top: 5px; width: 8px; }
    .tl-dot.green  { background: #22c55e; } .tl-dot.blue { background: #3b82f6; }
    .tl-dot.indigo { background: #6366f1; } .tl-dot.purple { background: #a855f7; }
    .tl-dot.orange { background: #f97316; }
    .tl-body { flex: 1; }
    .tl-head { align-items: center; display: flex; justify-content: space-between; }
    .tl-label { color: var(--muted, #64748b); font-size: .76rem; font-weight: 600; }
    .tl-date { color: var(--muted, #6b7280); font-family: monospace; font-size: .72rem; }
    .tl-value { font-size: .72rem; margin-top: 2px; }
    .tl-value.green { color: #16a34a; } .tl-value.blue { color: #2563eb; }
    .tl-value.indigo { color: #4f46e5; } .tl-value.purple { color: #9333ea; }
    .tl-value.orange { color: #ea580c; } .tl-value.red { color: #dc2626; }
    .tl-final { border-top: 1px solid var(--card-border, #e2e8f0); color: var(--shell-text, #374151); font-size: .82rem; margin-top: 12px; padding-top: 10px; }
    .green { color: #16a34a; } .red { color: #dc2626; }

    .shortfall-card { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 14px; }
    .sf-title { color: #92400e; font-size: .8rem; font-weight: 700; margin-bottom: 6px; }
    .sf-body { color: #78350f; display: flex; flex-direction: column; font-size: .75rem; gap: 3px; }

    .empty-result { align-items: center; background: var(--card-bg, #fff); border: 1px solid var(--card-border, #e2e8f0); border-radius: 12px; display: flex; flex-direction: column; gap: 10px; justify-content: center; padding: 40px 20px; text-align: center; }
    .empty-icon { font-size: 2.5rem; }
    .empty-result p { color: var(--muted, #9ca3af); font-size: .82rem; margin: 0; }

    :host-context(.dark-theme) .input-card,
    :host-context(.dark-theme) .timeline-card,
    :host-context(.dark-theme) .empty-result { background: #172033; border-color: #334155; }
    :host-context(.dark-theme) .sel,
    :host-context(.dark-theme) .inp { background: #1e293b; border-color: #334155; color: #e2e8f0; }
    :host-context(.dark-theme) .product-info { background: #1e293b; }
    :host-context(.dark-theme) .info-row span:last-child { color: #e2e8f0; }
    :host-context(.dark-theme) .tl-final { border-color: #334155; color: #e2e8f0; }
    :host-context(.dark-theme) .bottleneck-box { background: rgba(0,0,0,.3); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningDeliveryComponent {
  protected readonly products = PLANNING_PRODUCTS;

  private readonly lang = inject(LanguageService);
  private readonly svc = inject(PlanningService);

  productCode   = '';
  qty           = '';
  requestedDate = '';
  result        = signal<AnalysisResult | null>(null);

  t(key: string): string { return this.lang.translate(key); }
  get isVi(): boolean { return this.lang.language() === 'vi'; }
  get todayStr(): string { return this.svc.todayStr(); }

  get selectedProduct(): Product | undefined {
    return PLANNING_PRODUCTS.find(p => p.code === this.productCode);
  }

  neededRaw = computed(() => {
    const p = this.selectedProduct;
    if (!p || !this.qty) return 0;
    return parseFloat(this.qty) / p.yieldRate + p.wastageKg;
  });

  calculate(): void {
    const product = this.selectedProduct;
    if (!product || !this.qty || !this.requestedDate) return;

    const qtyNum = parseFloat(this.qty);
    const relMat = PLANNING_INVENTORY.find(m => {
      if (product.line === 'AV') return m.type === 'raw' && m.nameVN.toLowerCase().includes('nha đam');
      if (product.line === 'ND') return m.type === 'raw' && m.nameVN.toLowerCase().includes('thạch');
      if (product.line === 'GV') return m.type === 'raw' && m.nameVN.toLowerCase().includes('nước');
      return false;
    });

    const totalStock    = relMat ? relMat.stockWarehouse + relMat.stockSX1 + relMat.stockSX2 + relMat.stockSX4 : 0;
    const needed        = qtyNum / product.yieldRate + product.wastageKg;
    const shortfall     = Math.max(0, needed - totalStock);
    let materialStatus: AnalysisResult['materialStatus'] = 'available';
    let materialReady   = this.todayStr;

    if (shortfall > 0) {
      materialStatus = shortfall > needed * 0.5 ? 'need-purchase' : 'partial';
      materialReady  = this.svc.addDays(this.todayStr, relMat?.leadTimeDays ?? 14);
    }

    const machineDelay  = product.machineRequired === 'KM07' ? 1 : product.machineRequired === 'WM01' ? 2 : 3;
    const machineReady  = this.svc.addDays(this.todayStr, machineDelay);
    const startDate     = materialReady > machineReady ? materialReady : machineReady;
    const productionDays = Math.ceil((qtyNum / 1000) * product.productionDaysPerTon * 2);
    const qaDays        = product.qaDays;
    const logisticsDays = 3;
    const earliestDelivery = this.svc.addDays(startDate, productionDays + qaDays + logisticsDays);
    const feasible      = earliestDelivery <= this.requestedDate;

    let bottleneck = '';
    if (!feasible) {
      if (materialReady > machineReady && shortfall > 0) {
        bottleneck = this.isVi
          ? `Thiếu nguyên liệu (${shortfall.toFixed(0)} kg), cần ${relMat?.leadTimeDays ?? 14} ngày để mua`
          : `原料不足(${shortfall.toFixed(0)}公斤)，需${relMat?.leadTimeDays ?? 14}天採購`;
      } else {
        const daysLate = Math.round((new Date(earliestDelivery).getTime() - new Date(this.requestedDate).getTime()) / 86400000);
        bottleneck = this.isVi
          ? `Ngày giao sớm nhất trễ hơn yêu cầu ${daysLate} ngày`
          : `最早交貨日比要求晚${daysLate}天`;
      }
    }

    this.result.set({ materialReady, machineReady, productionDays, qaDays, logisticsDays, earliestDelivery, feasible, bottleneck, materialStatus, materialShortfall: shortfall });
  }

  timelineSteps(r: AnalysisResult) {
    const p = this.selectedProduct;
    const start = r.materialReady > r.machineReady ? r.materialReady : r.machineReady;
    return [
      {
        label: this.t('materialReady'), date: r.materialReady, dotClass: 'green',
        value: r.materialStatus === 'available'
          ? (this.isVi ? '✓ Đủ tồn kho' : '✓ 庫存充足')
          : r.materialStatus === 'partial'
          ? (this.isVi ? '⚠ Thiếu một phần' : '⚠ 部分不足')
          : (this.isVi ? '✗ Cần đặt mua toàn bộ' : '✗ 需全部採購'),
        valueClass: r.materialStatus === 'available' ? 'green' : 'red',
      },
      {
        label: this.t('machineReady'), date: r.machineReady, dotClass: 'blue',
        value: `${this.isVi ? 'Máy' : '機台'} ${p?.machineRequired} available`,
        valueClass: 'blue',
      },
      {
        label: this.t('productionTime'), date: this.svc.addDays(start, r.productionDays), dotClass: 'indigo',
        value: `${r.productionDays} ${this.isVi ? 'ngày SX' : '天生產'}`,
        valueClass: 'indigo',
      },
      {
        label: `${this.t('qaTime')} (${p?.qaDays} ${this.isVi ? 'ngày' : '天'})`, date: this.svc.addDays(start, r.productionDays + r.qaDays), dotClass: 'purple',
        value: this.isVi ? 'Kiểm định chất lượng' : '品質檢驗',
        valueClass: 'purple',
      },
      {
        label: `${this.t('logistics')} (${r.logisticsDays} ${this.isVi ? 'ngày' : '天'})`, date: r.earliestDelivery, dotClass: 'orange',
        value: this.isVi ? 'Chuẩn bị container & xuất hàng' : '備貨裝櫃出貨',
        valueClass: 'orange',
      },
    ];
  }

  fmtFull(s: string): string {
    return new Date(s).toLocaleDateString(this.isVi ? 'vi-VN' : 'zh-TW', { day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'long' });
  }

  fmtShort(s: string): string {
    return new Date(s).toLocaleDateString(this.isVi ? 'vi-VN' : 'zh-TW', { day: '2-digit', month: '2-digit' });
  }
}
