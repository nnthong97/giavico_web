import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/i18n/language.service';

type NdOrderStatus = 'pending' | 'confirmed' | 'material-risk' | 'scheduled' | 'in-production' | 'ready';
type NdStageKey = 'inoculation' | 'cultivation' | 'harvest' | 'heat' | 'cut' | 'pack' | 'qa';

interface NdProductRule {
  code: string;
  codeTW: string;
  nameVN: string;
  nameZH: string;
  spec: string;
  yieldRate: number;
  cultivationDays: number;
  harvestDays: number;
  heatDays: number;
  cuttingDays: number;
  qaDays: number;
  capacityKgPerDay: number;
  rawMaterialCode: string;
  packagingCode: string;
}

interface NdOrderPlan {
  id: string;
  orderCode: string;
  customer: string;
  region: string;
  productCode: string;
  qtyKg: number;
  producedKg: number;
  shippedKg: number;
  deliveryDate: string;
  status: NdOrderStatus;
  priority: 'normal' | 'urgent';
  source: string;
}

interface NdStockItem {
  code: string;
  nameVN: string;
  nameZH: string;
  type: 'raw' | 'semi' | 'auxiliary' | 'finished';
  unit: string;
  warehouse: number;
  sx1: number;
  sx2: number;
  expiryDate: string;
  leadTimeDays: number;
  supplier: string;
}

interface NdStage {
  key: NdStageKey;
  labelVN: string;
  labelZH: string;
  labelEN: string;
  date: string;
  owner: string;
}

interface NdRequirement {
  order: NdOrderPlan;
  product: NdProductRule;
  rawNeedKg: number;
  packagingNeed: number;
  rawAvailableKg: number;
  packagingAvailable: number;
  rawShortageKg: number;
  packagingShortage: number;
  productionDays: number;
  latestStartDate: string;
  risk: 'ok' | 'watch' | 'shortage' | 'late';
  stages: NdStage[];
}

const DAY_MS = 86_400_000;

const addDays = (date: string, offset: number): string => {
  const d = new Date(date);
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
};

const daysBetween = (from: string, to: string): number =>
  Math.round((new Date(to).getTime() - new Date(from).getTime()) / DAY_MS);

const today = (): string => new Date().toISOString().split('T')[0];

const ND_PRODUCTS: NdProductRule[] = [
  {
    code: 'VND-NC001-HAA-20',
    codeTW: 'ND-6E163-HA-25',
    nameVN: 'Thạch dừa hạt lựu 5-8mm',
    nameZH: '不蜜糖椰果丁 5-8mm',
    spec: '10kg carton / 5-8mm dice',
    yieldRate: 0.84,
    cultivationDays: 18,
    harvestDays: 2,
    heatDays: 1,
    cuttingDays: 2,
    qaDays: 2,
    capacityKgPerDay: 12_000,
    rawMaterialCode: 'ND-RAW-CULTURE',
    packagingCode: 'ND-BOX-10KG',
  },
  {
    code: 'VND-NC002-HAA-50',
    codeTW: 'VNC-AO222-HAA-50',
    nameVN: 'Thạch dừa tấm mỏng',
    nameZH: '薄片椰果',
    spec: '50kg drum / sheet',
    yieldRate: 0.82,
    cultivationDays: 20,
    harvestDays: 2,
    heatDays: 1,
    cuttingDays: 3,
    qaDays: 2,
    capacityKgPerDay: 8_000,
    rawMaterialCode: 'ND-RAW-SHEET',
    packagingCode: 'ND-DRUM-50KG',
  },
  {
    code: 'VND-AI002-BAA-52',
    codeTW: 'ND-AI002-BAA-52',
    nameVN: 'Thạch dừa phối cải trang',
    nameZH: '椰果改裝品',
    spec: 'mixed spec / controlled surplus',
    yieldRate: 0.80,
    cultivationDays: 18,
    harvestDays: 2,
    heatDays: 1,
    cuttingDays: 2,
    qaDays: 2,
    capacityKgPerDay: 7_000,
    rawMaterialCode: 'ND-RAW-CULTURE',
    packagingCode: 'ND-BOX-10KG',
  },
];

const ND_ORDERS: NdOrderPlan[] = [
  {
    id: 'nd-mgmt-1',
    orderCode: 'PTE-26020032-002',
    customer: 'AA081 / Kolkata',
    region: 'SEA',
    productCode: 'VND-NC001-HAA-20',
    qtyKg: 98_000,
    producedKg: 24_000,
    shippedKg: 0,
    deliveryDate: addDays(today(), 28),
    status: 'in-production',
    priority: 'urgent',
    source: '歐美-東南亞-韓國-日本區 訂單',
  },
  {
    id: 'nd-mgmt-2',
    orderCode: 'TW002-26-025',
    customer: 'TW002 Đài Loan',
    region: 'TW002',
    productCode: 'VND-NC001-HAA-20',
    qtyKg: 70_000,
    producedKg: 0,
    shippedKg: 0,
    deliveryDate: addDays(today(), 45),
    status: 'material-risk',
    priority: 'normal',
    source: '2026 年訂單管制表',
  },
  {
    id: 'nd-mgmt-3',
    orderCode: 'KR-26030005',
    customer: 'Korean Foods Ltd.',
    region: 'KR/JP',
    productCode: 'VND-NC002-HAA-50',
    qtyKg: 42_000,
    producedKg: 0,
    shippedKg: 0,
    deliveryDate: addDays(today(), 68),
    status: 'confirmed',
    priority: 'normal',
    source: 'ND 3月生產排程',
  },
  {
    id: 'nd-mgmt-4',
    orderCode: 'RPO-22100006-5',
    customer: 'Internal surplus control',
    region: 'VN',
    productCode: 'VND-AI002-BAA-52',
    qtyKg: 18_000,
    producedKg: 4_500,
    shippedKg: 0,
    deliveryDate: addDays(today(), 20),
    status: 'scheduled',
    priority: 'normal',
    source: 'KHỐNG CHẾ SỐ DƯ',
  },
];

const ND_STOCK: NdStockItem[] = [
  {
    code: 'ND-RAW-CULTURE',
    nameVN: 'Thạch dừa thô sau nuôi',
    nameZH: '培養後生椰果',
    type: 'raw',
    unit: 'kg',
    warehouse: 36_000,
    sx1: 8_500,
    sx2: 18_000,
    expiryDate: addDays(today(), 13),
    leadTimeDays: 18,
    supplier: 'SX1 / SX2 cultivation',
  },
  {
    code: 'ND-RAW-SHEET',
    nameVN: 'Bán thành phẩm thạch dừa tấm',
    nameZH: '椰果薄片半成品',
    type: 'semi',
    unit: 'kg',
    warehouse: 15_000,
    sx1: 5_000,
    sx2: 7_000,
    expiryDate: addDays(today(), 35),
    leadTimeDays: 20,
    supplier: 'SX1 sheet group',
  },
  {
    code: 'ND-BOX-10KG',
    nameVN: 'Thùng giấy chống nước 10kg',
    nameZH: '10kg防水紙箱',
    type: 'auxiliary',
    unit: 'box',
    warehouse: 7_200,
    sx1: 1_500,
    sx2: 1_100,
    expiryDate: addDays(today(), 365),
    leadTimeDays: 12,
    supplier: 'Bao bì nội địa',
  },
  {
    code: 'ND-DRUM-50KG',
    nameVN: 'Thùng phuy 50kg',
    nameZH: '50kg桶',
    type: 'auxiliary',
    unit: 'drum',
    warehouse: 820,
    sx1: 120,
    sx2: 80,
    expiryDate: addDays(today(), 540),
    leadTimeDays: 16,
    supplier: 'Kho bao bì',
  },
];

@Component({
  selector: 'app-planning-management',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="pm-page">
      <header class="pm-head">
        <div>
          <span class="eyebrow">{{ tl('Planning Management', 'Quản lý kế hoạch', '計劃管理') }}</span>
          <h3>{{ tl('ND Production Planning Control', 'Điều phối kế hoạch ND', 'ND椰果生產計劃管制') }}</h3>
          <p>{{ tl('First implementation slice: order control, material calculation, cultivation schedule, and risk actions for Nata de Coco.', 'Phần triển khai đầu tiên: quản lý đơn hàng, tính nguyên liệu, lịch cấy/thu hoạch/cắt và cảnh báo rủi ro cho ND.', '第一階段：ND訂單管制、原料計算、培養/採收/切割排程與風險處理。') }}</p>
        </div>
        <div class="head-actions">
          <button type="button" class="action-btn ghost" (click)="selectedOrderId.set('all')">
            {{ tl('Show all ND', 'Xem tất cả ND', '查看全部ND') }}
          </button>
          <button type="button" class="action-btn primary" (click)="activePanel.set('requirements')">
            {{ tl('Calculate needs', 'Tính nhu cầu', '計算需求') }}
          </button>
        </div>
      </header>

      <section class="phase-strip">
        @for (phase of phases; track phase.title) {
          <div class="phase-item" [class.active]="phase.active">
            <span>{{ phase.step }}</span>
            <div>
              <strong>{{ tl(phase.title, phase.titleVi, phase.titleZh) }}</strong>
              <small>{{ tl(phase.note, phase.noteVi, phase.noteZh) }}</small>
            </div>
          </div>
        }
      </section>

      <section class="kpi-grid">
        <div class="kpi">
          <span>{{ tl('ND active orders', 'Đơn ND đang mở', 'ND有效訂單') }}</span>
          <strong>{{ visibleOrders().length }}</strong>
          <small>{{ urgentCount() }} {{ tl('urgent', 'đơn gấp', '急單') }}</small>
        </div>
        <div class="kpi warn">
          <span>{{ tl('Material shortage', 'Thiếu nguyên liệu', '原料不足') }}</span>
          <strong>{{ shortageCount() }}</strong>
          <small>{{ totalRawShortage().toLocaleString() }} kg</small>
        </div>
        <div class="kpi">
          <span>{{ tl('Open quantity', 'SL chưa hoàn tất', '未完成數量') }}</span>
          <strong>{{ openQtyKg().toLocaleString() }}</strong>
          <small>kg</small>
        </div>
        <div class="kpi danger">
          <span>{{ tl('Late start risk', 'Rủi ro trễ ngày cấy', '接種逾期風險') }}</span>
          <strong>{{ lateStartCount() }}</strong>
          <small>{{ tl('orders', 'đơn', '筆') }}</small>
        </div>
      </section>

      <section class="toolbar">
        <div class="segmented">
          @for (panel of panels; track panel.key) {
            <button type="button" [class.active]="activePanel() === panel.key" (click)="activePanel.set(panel.key)">
              {{ tl(panel.en, panel.vi, panel.zh) }}
            </button>
          }
        </div>
        <div class="filters">
          <input [(ngModel)]="search" [placeholder]="tl('Search order, customer, product...', 'Tìm đơn, khách hàng, sản phẩm...', '搜尋訂單、客戶、產品...')" />
          <select [ngModel]="selectedOrderId()" (ngModelChange)="selectedOrderId.set($event)">
            <option value="all">{{ tl('All ND orders', 'Tất cả đơn ND', '全部ND訂單') }}</option>
            @for (o of orders; track o.id) {
              <option [value]="o.id">{{ o.orderCode }} · {{ o.customer }}</option>
            }
          </select>
        </div>
      </section>

      @if (activePanel() === 'orders') {
        <section class="table-surface">
          <div class="surface-head">
            <div>
              <h4>{{ tl('ND Order Control', 'Quản lý đơn hàng ND', 'ND訂單管制') }}</h4>
              <p>{{ tl('Tracks ordered, produced, shipped, remaining quantity, source file, and delivery risk.', 'Theo dõi SL đặt, đã SX, đã xuất, còn lại, file nguồn và rủi ro giao hàng.', '追蹤訂購量、已生產、已出貨、餘量、來源文件與交期風險。') }}</p>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{{ tl('Order', 'Mã đơn', '訂單') }}</th>
                  <th>{{ tl('Product', 'Sản phẩm', '產品') }}</th>
                  <th>{{ tl('Customer', 'Khách hàng', '客戶') }}</th>
                  <th class="right">{{ tl('Qty kg', 'SL kg', '數量kg') }}</th>
                  <th class="right">{{ tl('Produced', 'Đã SX', '已生產') }}</th>
                  <th>{{ tl('Delivery', 'Ngày giao', '交期') }}</th>
                  <th>{{ tl('Status', 'Trạng thái', '狀態') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (o of visibleOrders(); track o.id) {
                  @let req = requirementFor(o.id);
                  <tr [class.row-risk]="req.risk === 'shortage' || req.risk === 'late'">
                    <td>
                      <button type="button" class="link-btn" (click)="selectedOrderId.set(o.id); activePanel.set('schedule')">{{ o.orderCode }}</button>
                      <small>{{ o.source }}</small>
                    </td>
                    <td>
                      <strong>{{ productName(o.productCode) }}</strong>
                      <small>{{ o.productCode }}</small>
                    </td>
                    <td>{{ o.customer }}<small>{{ o.region }}</small></td>
                    <td class="right strong">{{ o.qtyKg.toLocaleString() }}</td>
                    <td class="right">
                      <strong>{{ o.producedKg.toLocaleString() }}</strong>
                      <div class="meter"><span [style.width.%]="progress(o)"></span></div>
                    </td>
                    <td>{{ formatDate(o.deliveryDate) }}<small>{{ daysBetweenToday(o.deliveryDate) }} {{ tl('days left', 'ngày nữa', '天後') }}</small></td>
                    <td>
                      <span class="status-pill" [attr.data-status]="o.status">{{ statusLabel(o.status) }}</span>
                      @if (o.priority === 'urgent') { <span class="priority">{{ tl('Urgent', 'Gấp', '急單') }}</span> }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      @if (activePanel() === 'requirements') {
        <section class="requirements-grid">
          @for (req of visibleRequirements(); track req.order.id) {
            <article class="requirement">
              <div class="req-top">
                <div>
                  <span class="risk-dot" [attr.data-risk]="req.risk"></span>
                  <strong>{{ req.order.orderCode }}</strong>
                  <small>{{ productName(req.order.productCode) }} · {{ req.product.spec }}</small>
                </div>
                <span class="risk-label" [attr.data-risk]="req.risk">{{ riskLabel(req.risk) }}</span>
              </div>
              <div class="req-metrics">
                <div>
                  <span>{{ tl('Raw need', 'Cần nguyên liệu', '原料需求') }}</span>
                  <strong>{{ req.rawNeedKg.toLocaleString() }} kg</strong>
                </div>
                <div>
                  <span>{{ tl('Available', 'Tồn khả dụng', '可用庫存') }}</span>
                  <strong>{{ req.rawAvailableKg.toLocaleString() }} kg</strong>
                </div>
                <div>
                  <span>{{ tl('Packaging', 'Bao bì', '包材') }}</span>
                  <strong>{{ req.packagingNeed.toLocaleString() }}</strong>
                </div>
                <div>
                  <span>{{ tl('Prod. days', 'Ngày SX', '生產天數') }}</span>
                  <strong>{{ req.productionDays }}</strong>
                </div>
              </div>
              @if (req.rawShortageKg > 0 || req.packagingShortage > 0) {
                <div class="shortage-box">
                  <strong>{{ tl('Purchase / cultivation action required', 'Cần hành động mua/cấy bổ sung', '需採購/補培養') }}</strong>
                  <span>
                    {{ tl('Raw shortage', 'Thiếu nguyên liệu', '原料不足') }}:
                    {{ req.rawShortageKg.toLocaleString() }} kg ·
                    {{ tl('packaging shortage', 'thiếu bao bì', '包材不足') }}:
                    {{ req.packagingShortage.toLocaleString() }}
                  </span>
                </div>
              }
              <button type="button" class="inline-action" (click)="selectedOrderId.set(req.order.id); activePanel.set('schedule')">
                {{ tl('Review schedule', 'Xem lịch lùi', '查看反排程') }}
              </button>
            </article>
          }
        </section>
      }

      @if (activePanel() === 'schedule') {
        <section class="schedule-layout">
          <div class="schedule-list">
            @for (req of visibleRequirements(); track req.order.id) {
              <article class="timeline-card">
                <div class="timeline-head">
                  <div>
                    <strong>{{ req.order.orderCode }}</strong>
                    <small>{{ tl('Latest inoculation/start', 'Ngày cấy muộn nhất', '最晚接種日') }}: {{ formatDate(req.latestStartDate) }}</small>
                  </div>
                  <span class="risk-label" [attr.data-risk]="req.risk">{{ riskLabel(req.risk) }}</span>
                </div>
                <div class="timeline">
                  @for (stage of req.stages; track stage.key) {
                    <div class="stage" [class.past]="isPast(stage.date)">
                      <span class="stage-date">{{ formatShort(stage.date) }}</span>
                      <span class="stage-line"></span>
                      <div>
                        <strong>{{ tl(stage.labelEN, stage.labelVN, stage.labelZH) }}</strong>
                        <small>{{ stage.owner }}</small>
                      </div>
                    </div>
                  }
                </div>
              </article>
            }
          </div>
          <aside class="action-queue">
            <h4>{{ tl('ND Action Queue', 'Việc cần xử lý ND', 'ND待處理事項') }}</h4>
            @for (action of actionQueue(); track action.title) {
              <div class="queue-item" [attr.data-level]="action.level">
                <strong>{{ action.title }}</strong>
                <span>{{ action.detail }}</span>
              </div>
            }
          </aside>
        </section>
      }

      @if (activePanel() === 'inventory') {
        <section class="table-surface">
          <div class="surface-head">
            <div>
              <h4>{{ tl('ND Stock Readiness', 'Tình trạng tồn kho ND', 'ND庫存準備') }}</h4>
              <p>{{ tl('Warehouse + SX1 + SX2 stock with lead time and expiry risk.', 'Tồn kho Kho + SX1 + SX2 cùng thời gian mua/cấy và hạn sử dụng.', '倉庫+生產一+生產二庫存、前置期與效期風險。') }}</p>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{{ tl('Code', 'Mã', '代碼') }}</th>
                  <th>{{ tl('Material', 'Vật tư', '物料') }}</th>
                  <th class="right">{{ tl('Warehouse', 'Kho', '倉庫') }}</th>
                  <th class="right">SX1</th>
                  <th class="right">SX2</th>
                  <th class="right">{{ tl('Total', 'Tổng', '合計') }}</th>
                  <th>{{ tl('Expiry', 'Hạn SD', '效期') }}</th>
                  <th>{{ tl('Lead time', 'Lead time', '前置期') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (item of stock; track item.code) {
                  <tr>
                    <td class="mono">{{ item.code }}</td>
                    <td><strong>{{ tl(item.nameVN, item.nameVN, item.nameZH) }}</strong><small>{{ item.supplier }}</small></td>
                    <td class="right">{{ item.warehouse.toLocaleString() }}</td>
                    <td class="right">{{ item.sx1.toLocaleString() }}</td>
                    <td class="right">{{ item.sx2.toLocaleString() }}</td>
                    <td class="right strong">{{ stockTotal(item).toLocaleString() }} {{ item.unit }}</td>
                    <td>{{ formatDate(item.expiryDate) }}<small>{{ daysBetweenToday(item.expiryDate) }} {{ tl('days', 'ngày', '天') }}</small></td>
                    <td>{{ item.leadTimeDays }} {{ tl('days', 'ngày', '天') }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      @if (activePanel() === 'imports') {
        <section class="import-board">
          <div class="import-copy">
            <h4>{{ tl('ND Import Pipeline', 'Luồng nhập dữ liệu ND', 'ND資料匯入流程') }}</h4>
            <p>{{ tl('This page is prepared for controlled imports from the ND workbooks before saving normalized planning records.', 'Trang này chuẩn bị cho việc nhập có kiểm soát từ các file ND trước khi lưu dữ liệu kế hoạch chuẩn hóa.', '此頁用於從ND表格受控匯入，確認後再保存為標準計劃資料。') }}</p>
          </div>
          <div class="import-steps">
            @for (step of importSteps; track step.title) {
              <div class="import-step">
                <span>{{ step.no }}</span>
                <div>
                  <strong>{{ tl(step.title, step.titleVi, step.titleZh) }}</strong>
                  <small>{{ tl(step.detail, step.detailVi, step.detailZh) }}</small>
                </div>
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .pm-page { display: flex; flex-direction: column; gap: 16px; }
    .pm-head { align-items: flex-end; display: flex; gap: 16px; justify-content: space-between; }
    .eyebrow { color: #3b82f6; display: block; font-size: .72rem; font-weight: 800; letter-spacing: .08em; margin-bottom: 5px; text-transform: uppercase; }
    h3, h4 { color: var(--shell-text, #17233b); margin: 0; }
    h3 { font-size: 1.25rem; font-weight: 800; }
    h4 { font-size: .95rem; font-weight: 800; }
    p { color: var(--muted, #64748b); font-size: .8rem; line-height: 1.5; margin: 5px 0 0; max-width: 760px; }
    .head-actions, .filters, .toolbar, .segmented, .req-top, .timeline-head, .surface-head { align-items: center; display: flex; gap: 10px; }
    .head-actions { flex-wrap: wrap; justify-content: flex-end; }
    .action-btn, .inline-action, .segmented button { border: 1px solid transparent; border-radius: 7px; cursor: pointer; font-size: .78rem; font-weight: 750; padding: 8px 12px; }
    .action-btn.primary, .inline-action { background: #2563eb; color: #fff; }
    .action-btn.ghost { background: var(--card-bg, #fff); border-color: var(--card-border, #dbe3ef); color: var(--shell-text, #334155); }

    .phase-strip { display: grid; gap: 8px; grid-template-columns: repeat(5, minmax(0, 1fr)); }
    .phase-item { align-items: flex-start; background: var(--card-bg, #fff); border: 1px solid var(--card-border, #e2e8f0); border-radius: 8px; display: flex; gap: 9px; padding: 11px; }
    .phase-item.active { border-color: #3b82f6; box-shadow: inset 0 0 0 1px rgba(59,130,246,.25); }
    .phase-item > span { align-items: center; background: #e0f2fe; border-radius: 50%; color: #0369a1; display: inline-flex; flex: 0 0 auto; font-size: .72rem; font-weight: 900; height: 24px; justify-content: center; width: 24px; }
    .phase-item strong, .phase-item small { display: block; }
    .phase-item strong { color: var(--shell-text, #1f2937); font-size: .76rem; }
    .phase-item small { color: var(--muted, #64748b); font-size: .68rem; line-height: 1.35; margin-top: 3px; }

    .kpi-grid { display: grid; gap: 10px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .kpi { background: var(--card-bg, #fff); border: 1px solid var(--card-border, #e2e8f0); border-radius: 9px; padding: 13px; }
    .kpi span, .kpi small { color: var(--muted, #64748b); display: block; font-size: .72rem; }
    .kpi strong { color: var(--shell-text, #111827); display: block; font-size: 1.65rem; line-height: 1; margin: 8px 0 5px; }
    .kpi.warn strong { color: #c2410c; }
    .kpi.danger strong { color: #dc2626; }

    .toolbar { background: var(--card-bg, #fff); border: 1px solid var(--card-border, #e2e8f0); border-radius: 9px; justify-content: space-between; padding: 10px; }
    .segmented { background: var(--th-bg, #f1f5f9); border-radius: 8px; gap: 3px; padding: 3px; }
    .segmented button { background: transparent; color: var(--muted, #64748b); padding: 7px 10px; }
    .segmented button.active { background: #2563eb; color: #fff; }
    .filters { flex-wrap: wrap; justify-content: flex-end; }
    input, select { background: var(--card-bg, #fff); border: 1px solid var(--card-border, #dbe3ef); border-radius: 7px; color: var(--shell-text, #334155); font: inherit; font-size: .78rem; min-height: 34px; padding: 7px 9px; }
    input { min-width: 260px; }

    .table-surface, .requirement, .timeline-card, .action-queue, .import-board { background: var(--card-bg, #fff); border: 1px solid var(--card-border, #e2e8f0); border-radius: 9px; }
    .surface-head { justify-content: space-between; padding: 15px 16px; }
    .table-wrap { overflow-x: auto; }
    table { border-collapse: collapse; font-size: .78rem; width: 100%; }
    th { background: var(--th-bg, #f8fafc); border-bottom: 1px solid var(--card-border, #e2e8f0); color: var(--muted, #64748b); font-size: .69rem; font-weight: 800; padding: 10px 12px; text-align: left; text-transform: uppercase; }
    td { border-bottom: 1px solid var(--row-border, #edf2f7); color: var(--shell-text, #334155); padding: 10px 12px; vertical-align: top; }
    tr:last-child td { border-bottom: 0; }
    tr.row-risk td { background: rgba(255, 247, 237, .72); }
    td small { color: var(--muted, #64748b); display: block; font-size: .67rem; margin-top: 3px; }
    .right { text-align: right; }
    .strong { font-weight: 800; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .link-btn { background: transparent; border: 0; color: #2563eb; cursor: pointer; font: inherit; font-weight: 800; padding: 0; }
    .meter { background: #e2e8f0; border-radius: 99px; height: 4px; margin-top: 5px; overflow: hidden; }
    .meter span { background: #2563eb; display: block; height: 100%; }
    .status-pill, .priority, .risk-label { border-radius: 999px; display: inline-block; font-size: .67rem; font-weight: 800; padding: 3px 8px; white-space: nowrap; }
    .status-pill[data-status="pending"] { background: #f1f5f9; color: #475569; }
    .status-pill[data-status="confirmed"] { background: #ede9fe; color: #6d28d9; }
    .status-pill[data-status="material-risk"] { background: #ffedd5; color: #c2410c; }
    .status-pill[data-status="scheduled"] { background: #dbeafe; color: #1d4ed8; }
    .status-pill[data-status="in-production"] { background: #dcfce7; color: #15803d; }
    .status-pill[data-status="ready"] { background: #ccfbf1; color: #0f766e; }
    .priority { background: #fee2e2; color: #991b1b; margin-top: 5px; }

    .requirements-grid { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .requirement { display: flex; flex-direction: column; gap: 13px; padding: 14px; }
    .req-top { justify-content: space-between; }
    .req-top strong, .req-top small { display: block; }
    .req-top small { color: var(--muted, #64748b); font-size: .7rem; margin-top: 3px; }
    .risk-dot { border-radius: 50%; display: inline-block; height: 9px; margin-right: 7px; width: 9px; }
    .risk-dot[data-risk="ok"], .risk-label[data-risk="ok"] { background: #dcfce7; color: #15803d; }
    .risk-dot[data-risk="watch"], .risk-label[data-risk="watch"] { background: #fef9c3; color: #a16207; }
    .risk-dot[data-risk="shortage"], .risk-label[data-risk="shortage"] { background: #ffedd5; color: #c2410c; }
    .risk-dot[data-risk="late"], .risk-label[data-risk="late"] { background: #fee2e2; color: #991b1b; }
    .req-metrics { display: grid; gap: 8px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .req-metrics div { background: var(--th-bg, #f8fafc); border-radius: 7px; padding: 9px; }
    .req-metrics span { color: var(--muted, #64748b); display: block; font-size: .66rem; }
    .req-metrics strong { color: var(--shell-text, #111827); display: block; font-size: .84rem; margin-top: 4px; }
    .shortage-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; color: #9a3412; display: flex; flex-direction: column; font-size: .73rem; gap: 3px; padding: 10px; }
    .inline-action { align-self: flex-start; }

    .schedule-layout { align-items: start; display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr) 320px; }
    .schedule-list { display: grid; gap: 12px; }
    .timeline-card { padding: 14px; }
    .timeline-head { justify-content: space-between; margin-bottom: 12px; }
    .timeline-head strong, .timeline-head small { display: block; }
    .timeline-head small { color: var(--muted, #64748b); font-size: .7rem; margin-top: 3px; }
    .timeline { display: grid; gap: 8px; grid-template-columns: repeat(7, minmax(0, 1fr)); }
    .stage { background: var(--th-bg, #f8fafc); border: 1px solid var(--row-border, #edf2f7); border-radius: 8px; min-height: 112px; padding: 9px; }
    .stage.past { border-color: #fca5a5; }
    .stage-date { color: #2563eb; display: block; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .7rem; font-weight: 800; }
    .stage-line { background: #3b82f6; display: block; height: 3px; margin: 8px 0; width: 28px; }
    .stage strong { color: var(--shell-text, #1f2937); display: block; font-size: .73rem; line-height: 1.25; }
    .stage small { color: var(--muted, #64748b); display: block; font-size: .66rem; margin-top: 5px; }
    .action-queue { padding: 14px; }
    .action-queue h4 { margin-bottom: 10px; }
    .queue-item { border-left: 3px solid #3b82f6; display: flex; flex-direction: column; gap: 3px; padding: 9px 0 9px 10px; }
    .queue-item[data-level="error"] { border-color: #ef4444; }
    .queue-item[data-level="warning"] { border-color: #f97316; }
    .queue-item strong { color: var(--shell-text, #1f2937); font-size: .76rem; }
    .queue-item span { color: var(--muted, #64748b); font-size: .7rem; line-height: 1.4; }

    .import-board { display: grid; gap: 16px; grid-template-columns: 320px minmax(0, 1fr); padding: 16px; }
    .import-steps { display: grid; gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .import-step { align-items: flex-start; background: var(--th-bg, #f8fafc); border-radius: 8px; display: flex; gap: 10px; padding: 11px; }
    .import-step > span { align-items: center; background: #2563eb; border-radius: 50%; color: #fff; display: inline-flex; flex: 0 0 auto; font-size: .72rem; font-weight: 900; height: 24px; justify-content: center; width: 24px; }
    .import-step strong { color: var(--shell-text, #1f2937); display: block; font-size: .76rem; }
    .import-step small { color: var(--muted, #64748b); display: block; font-size: .68rem; line-height: 1.35; margin-top: 3px; }

    :host-context(.dark-theme) .phase-item,
    :host-context(.dark-theme) .kpi,
    :host-context(.dark-theme) .toolbar,
    :host-context(.dark-theme) .table-surface,
    :host-context(.dark-theme) .requirement,
    :host-context(.dark-theme) .timeline-card,
    :host-context(.dark-theme) .action-queue,
    :host-context(.dark-theme) .import-board { background: #172033; border-color: #334155; }
    :host-context(.dark-theme) input,
    :host-context(.dark-theme) select,
    :host-context(.dark-theme) .action-btn.ghost { background: #1e293b; border-color: #334155; color: #e2e8f0; }
    :host-context(.dark-theme) th,
    :host-context(.dark-theme) .segmented,
    :host-context(.dark-theme) .req-metrics div,
    :host-context(.dark-theme) .stage,
    :host-context(.dark-theme) .import-step { background: #1e293b; }
    :host-context(.dark-theme) td { border-color: #334155; color: #cbd5e1; }
    :host-context(.dark-theme) tr.row-risk td { background: rgba(154,52,18,.12); }
    :host-context(.dark-theme) h3,
    :host-context(.dark-theme) h4,
    :host-context(.dark-theme) .phase-item strong,
    :host-context(.dark-theme) .req-metrics strong,
    :host-context(.dark-theme) .stage strong,
    :host-context(.dark-theme) .queue-item strong,
    :host-context(.dark-theme) .import-step strong { color: #e2e8f0; }

    @media (max-width: 980px) {
      .pm-head, .toolbar { align-items: stretch; flex-direction: column; }
      .phase-strip, .kpi-grid, .requirements-grid, .schedule-layout, .import-board, .import-steps { grid-template-columns: 1fr; }
      .timeline { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .filters { justify-content: stretch; }
      input, select { width: 100%; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningManagementComponent {
  private readonly lang = inject(LanguageService);

  protected readonly orders = ND_ORDERS;
  protected readonly stock = ND_STOCK;
  protected readonly panels = [
    { key: 'orders', en: 'Orders', vi: 'Đơn hàng', zh: '訂單' },
    { key: 'requirements', en: 'Material needs', vi: 'Nhu cầu vật tư', zh: '物料需求' },
    { key: 'schedule', en: 'ND schedule', vi: 'Lịch ND', zh: 'ND排程' },
    { key: 'inventory', en: 'Stock readiness', vi: 'Tồn kho', zh: '庫存準備' },
    { key: 'imports', en: 'Import workflow', vi: 'Luồng nhập file', zh: '匯入流程' },
  ] as const;

  protected readonly phases = [
    { step: '1', title: 'Import', titleVi: 'Nhập file', titleZh: '匯入', note: 'Order and ND reports', noteVi: 'Đơn hàng và báo cáo ND', noteZh: '訂單與ND報表', active: true },
    { step: '2', title: 'Normalize', titleVi: 'Chuẩn hóa', titleZh: '標準化', note: 'Codes, dates, quantities', noteVi: 'Mã, ngày, số lượng', noteZh: '代碼、日期、數量', active: true },
    { step: '3', title: 'Calculate', titleVi: 'Tính toán', titleZh: '計算', note: 'Materials and shortages', noteVi: 'Vật tư và thiếu hụt', noteZh: '物料與缺口', active: true },
    { step: '4', title: 'Schedule', titleVi: 'Lên lịch', titleZh: '排程', note: 'Cultivate to pack', noteVi: 'Từ cấy đến đóng gói', noteZh: '培養至包裝', active: true },
    { step: '5', title: 'Track', titleVi: 'Theo dõi', titleZh: '追蹤', note: 'Production and delivery', noteVi: 'Sản xuất và giao hàng', noteZh: '生產與出貨', active: false },
  ];

  protected readonly importSteps = [
    { no: '1', title: 'Upload ND workbook', titleVi: 'Tải file ND', titleZh: '上傳ND表', detail: 'ND schedule, raw stock, cutting plan', detailVi: 'Lịch ND, tồn nguyên liệu, kế hoạch cắt', detailZh: 'ND排程、原料庫存、切割計劃' },
    { no: '2', title: 'Preview mapping', titleVi: 'Xem mapping', titleZh: '預覽對應', detail: 'Confirm product, qty, dates, status', detailVi: 'Xác nhận sản phẩm, SL, ngày, trạng thái', detailZh: '確認產品、數量、日期、狀態' },
    { no: '3', title: 'Validate risk', titleVi: 'Kiểm tra rủi ro', titleZh: '檢查風險', detail: 'Shortage, expiry, late inoculation', detailVi: 'Thiếu hàng, hết hạn, trễ ngày cấy', detailZh: '缺料、效期、接種逾期' },
    { no: '4', title: 'Commit records', titleVi: 'Lưu dữ liệu', titleZh: '保存資料', detail: 'Save normalized planning data', detailVi: 'Lưu dữ liệu kế hoạch chuẩn hóa', detailZh: '保存標準計劃資料' },
  ];

  protected readonly activePanel = signal<(typeof this.panels)[number]['key']>('orders');
  protected readonly selectedOrderId = signal('all');
  protected search = '';

  protected readonly requirements = computed(() => this.orders.map(order => this.buildRequirement(order)));
  protected readonly visibleOrders = computed(() => {
    const selected = this.selectedOrderId();
    const q = this.search.trim().toLowerCase();
    return this.orders.filter(order => {
      if (selected !== 'all' && order.id !== selected) return false;
      if (!q) return true;
      const product = this.productFor(order.productCode);
      return [
        order.orderCode,
        order.customer,
        order.region,
        product?.nameVN,
        product?.nameZH,
        order.productCode,
      ].filter(Boolean).some(value => String(value).toLowerCase().includes(q));
    });
  });
  protected readonly visibleRequirements = computed(() => {
    const ids = new Set(this.visibleOrders().map(order => order.id));
    return this.requirements().filter(req => ids.has(req.order.id));
  });
  protected readonly urgentCount = computed(() => this.visibleOrders().filter(order => order.priority === 'urgent').length);
  protected readonly shortageCount = computed(() => this.visibleRequirements().filter(req => req.rawShortageKg > 0 || req.packagingShortage > 0).length);
  protected readonly lateStartCount = computed(() => this.visibleRequirements().filter(req => req.risk === 'late').length);
  protected readonly totalRawShortage = computed(() => this.visibleRequirements().reduce((sum, req) => sum + req.rawShortageKg, 0));
  protected readonly openQtyKg = computed(() => this.visibleOrders().reduce((sum, order) => sum + Math.max(order.qtyKg - order.producedKg, 0), 0));

  protected readonly actionQueue = computed(() => {
    const actions: { title: string; detail: string; level: 'info' | 'warning' | 'error' }[] = [];
    for (const req of this.visibleRequirements()) {
      if (req.risk === 'late') {
        actions.push({
          title: `${req.order.orderCode}: ${this.tl('late inoculation window', 'trễ cửa sổ cấy', '接種窗口逾期')}`,
          detail: `${this.tl('Latest start', 'Ngày cấy muộn nhất', '最晚開始')}: ${this.formatDate(req.latestStartDate)}.`,
          level: 'error',
        });
      }
      if (req.rawShortageKg > 0) {
        actions.push({
          title: `${req.order.orderCode}: ${this.tl('raw material shortage', 'thiếu nguyên liệu', '原料不足')}`,
          detail: `${req.rawShortageKg.toLocaleString()} kg ${this.tl('must be cultivated or reassigned from SX stock.', 'cần cấy bổ sung hoặc điều phối từ tồn SX.', '需補培養或從現場庫存調撥。')}`,
          level: 'warning',
        });
      }
      if (req.packagingShortage > 0) {
        actions.push({
          title: `${req.order.orderCode}: ${this.tl('packaging shortage', 'thiếu bao bì', '包材不足')}`,
          detail: `${req.packagingShortage.toLocaleString()} ${this.tl('units required before pack date.', 'đơn vị cần trước ngày đóng gói.', '個需於包裝日前到位。')}`,
          level: 'warning',
        });
      }
    }
    if (actions.length === 0) {
      actions.push({
        title: this.tl('No critical ND blockers', 'Không có điểm nghẽn ND nghiêm trọng', '目前無ND重大阻礙'),
        detail: this.tl('Continue tracking daily production and stock reports.', 'Tiếp tục theo dõi báo cáo sản xuất và tồn kho hằng ngày.', '持續追蹤每日生產與庫存報表。'),
        level: 'info',
      });
    }
    return actions;
  });

  protected tl(en: string, vi: string, zh: string): string {
    const language = this.lang.language();
    return language === 'vi' ? vi : language === 'zh-TW' ? zh : en;
  }

  protected productName(code: string): string {
    const product = this.productFor(code);
    if (!product) return code;
    return this.tl(product.nameVN, product.nameVN, product.nameZH);
  }

  protected productFor(code: string): NdProductRule | undefined {
    return ND_PRODUCTS.find(product => product.code === code);
  }

  protected requirementFor(orderId: string): NdRequirement {
    return this.requirements().find(req => req.order.id === orderId) ?? this.requirements()[0];
  }

  protected stockTotal(item: NdStockItem): number {
    return item.warehouse + item.sx1 + item.sx2;
  }

  protected progress(order: NdOrderPlan): number {
    return order.qtyKg > 0 ? Math.min(100, Math.round((order.producedKg / order.qtyKg) * 100)) : 0;
  }

  protected daysBetweenToday(date: string): number {
    return daysBetween(today(), date);
  }

  protected isPast(date: string): boolean {
    return daysBetween(today(), date) < 0;
  }

  protected formatDate(date: string): string {
    return new Date(date).toLocaleDateString(this.locale());
  }

  protected formatShort(date: string): string {
    return new Date(date).toLocaleDateString(this.locale(), { month: '2-digit', day: '2-digit' });
  }

  protected statusLabel(status: NdOrderStatus): string {
    const labels: Record<NdOrderStatus, [string, string, string]> = {
      pending: ['Pending', 'Chưa làm', '未開始'],
      confirmed: ['Confirmed', 'Đã xác nhận', '已確認'],
      'material-risk': ['Material risk', 'Rủi ro vật tư', '物料風險'],
      scheduled: ['Scheduled', 'Đã lên lịch', '已排程'],
      'in-production': ['In production', 'Đang sản xuất', '生產中'],
      ready: ['Ready', 'Chờ xuất', '待出貨'],
    };
    return this.tl(...labels[status]);
  }

  protected riskLabel(risk: NdRequirement['risk']): string {
    const labels: Record<NdRequirement['risk'], [string, string, string]> = {
      ok: ['Ready', 'Sẵn sàng', '可執行'],
      watch: ['Watch', 'Theo dõi', '需關注'],
      shortage: ['Shortage', 'Thiếu vật tư', '缺料'],
      late: ['Late risk', 'Nguy cơ trễ', '逾期風險'],
    };
    return this.tl(...labels[risk]);
  }

  private buildRequirement(order: NdOrderPlan): NdRequirement {
    const product = this.productFor(order.productCode) ?? ND_PRODUCTS[0];
    const openQty = Math.max(order.qtyKg - order.producedKg, 0);
    const rawNeedKg = Math.ceil(openQty / product.yieldRate);
    const packagingNeed = product.packagingCode.includes('DRUM')
      ? Math.ceil(openQty / 50)
      : Math.ceil(openQty / 10);
    const rawAvailableKg = this.available(product.rawMaterialCode);
    const packagingAvailable = this.available(product.packagingCode);
    const rawShortageKg = Math.max(rawNeedKg - rawAvailableKg, 0);
    const packagingShortage = Math.max(packagingNeed - packagingAvailable, 0);
    const productionDays = Math.max(1, Math.ceil(openQty / product.capacityKgPerDay));
    const packDate = addDays(order.deliveryDate, -(product.qaDays + 1));
    const cutDate = addDays(packDate, -product.cuttingDays);
    const heatDate = addDays(cutDate, -product.heatDays);
    const harvestDate = addDays(heatDate, -product.harvestDays);
    const inoculationDate = addDays(harvestDate, -product.cultivationDays);
    const latestStartDate = inoculationDate;

    let risk: NdRequirement['risk'] = 'ok';
    if (daysBetween(today(), latestStartDate) < 0) {
      risk = 'late';
    } else if (rawShortageKg > 0 || packagingShortage > 0) {
      risk = 'shortage';
    } else if (daysBetween(today(), latestStartDate) <= 5 || daysBetween(today(), order.deliveryDate) <= 21) {
      risk = 'watch';
    }

    return {
      order,
      product,
      rawNeedKg,
      packagingNeed,
      rawAvailableKg,
      packagingAvailable,
      rawShortageKg,
      packagingShortage,
      productionDays,
      latestStartDate,
      risk,
      stages: [
        { key: 'inoculation', labelEN: 'Inoculation', labelVN: 'Cấy giống', labelZH: '接種', date: inoculationDate, owner: 'SX1 / SX2' },
        { key: 'cultivation', labelEN: 'Cultivation', labelVN: 'Nuôi thạch', labelZH: '培養', date: addDays(inoculationDate, product.cultivationDays), owner: `${product.cultivationDays} days` },
        { key: 'harvest', labelEN: 'Harvest', labelVN: 'Thu hoạch', labelZH: '採收', date: harvestDate, owner: 'Production' },
        { key: 'heat', labelEN: 'Heat treatment', labelVN: 'Gia nhiệt', labelZH: '加熱', date: heatDate, owner: 'Production / QC' },
        { key: 'cut', labelEN: 'Cutting', labelVN: 'Cắt hạt/tấm', labelZH: '切割', date: cutDate, owner: 'SX2 cutting' },
        { key: 'pack', labelEN: 'Pack', labelVN: 'Đóng gói', labelZH: '包裝', date: packDate, owner: 'Packing' },
        { key: 'qa', labelEN: 'QA release', labelVN: 'QA duyệt', labelZH: 'QA放行', date: addDays(packDate, product.qaDays), owner: 'QA / Warehouse' },
      ],
    };
  }

  private available(code: string): number {
    const item = this.stock.find(stockItem => stockItem.code === code);
    return item ? this.stockTotal(item) : 0;
  }

  private locale(): string {
    const language = this.lang.language();
    return language === 'vi' ? 'vi-VN' : language === 'zh-TW' ? 'zh-TW' : 'en-US';
  }
}
