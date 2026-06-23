import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

type InventoryListMode = 'products' | 'stocks' | 'expired';
type InventoryStockStatus =
  | 'inStock'
  | 'reorderSoon'
  | 'lowStock'
  | 'outOfStock'
  | 'critical';

interface InventoryListRow {
  name: string;
  sku: string;
  category: string;
  brand: string;
  warehouse: string;
  qty: number;
  reorderLevel: number;
  status: InventoryStockStatus;
  avatar: string;
  lastUpdated: string;
  expiredDate: string;
  manufacturedDate: string;
}

interface InventoryListLabels {
  availableQty: string;
  brand: string;
  category: string;
  critical: string;
  expiredDate: string;
  filter: string;
  goTo: string;
  inStock: string;
  items: string;
  lastUpdatedOn: string;
  lowStock: string;
  manufacturedDate: string;
  outOfStock: string;
  pageSize: string;
  product: string;
  reorderLevel: string;
  reorderSoon: string;
  search: string;
  sku: string;
  status: string;
  warehouse: string;
}

const DEFAULT_LABELS: InventoryListLabels = {
  availableQty: 'Available Qty',
  brand: 'Brand',
  category: 'Category',
  critical: 'Critical',
  expiredDate: 'Expired Date',
  filter: 'Filter',
  goTo: 'Go to',
  inStock: 'In Stock',
  items: 'items',
  lastUpdatedOn: 'Last Updated on',
  lowStock: 'Low Stock',
  manufacturedDate: 'Manufactured Date',
  outOfStock: 'Out of Stock',
  pageSize: '10/page',
  product: 'Product',
  reorderLevel: 'Reorder level',
  reorderSoon: 'Reorder Soon',
  search: 'Search',
  sku: 'SKU',
  status: 'Status',
  warehouse: 'Warehouse',
};

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="list-page">
      <div class="page-heading">
        <h1>{{ title }}</h1>
        <div class="heading-actions">
          <button *ngIf="secondaryLabel" class="secondary-button" type="button">
            {{ secondaryLabel }}
          </button>
          <button class="primary-button" type="button" (click)="primary.emit()">
            + {{ primaryLabel }}
          </button>
        </div>
      </div>
      <article class="panel table-panel">
        <div class="table-toolbar">
          <h2>{{ cardTitle }}</h2>
          <div class="toolbar-actions">
            <label class="table-search">
              <span>⌕</span>
              <input type="search" [placeholder]="labels.search" />
            </label>
            <button type="button" class="filter-button">▽ {{ labels.filter }}</button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th><input type="checkbox" /></th>
              <th>{{ labels.product }}</th>
              <th>{{ labels.sku }}</th>
              <th *ngIf="mode === 'products'">{{ labels.category }}</th>
              <th *ngIf="mode === 'products'">{{ labels.brand }}</th>
              <th>{{ labels.warehouse }}</th>
              <th *ngIf="mode === 'stocks'">{{ labels.availableQty }}</th>
              <th *ngIf="mode === 'stocks'">{{ labels.lastUpdatedOn }}</th>
              <th *ngIf="mode === 'expired'">{{ labels.expiredDate }}</th>
              <th *ngIf="mode === 'expired'">{{ labels.manufacturedDate }}</th>
              <th *ngIf="mode !== 'expired'">{{ labels.reorderLevel }}</th>
              <th *ngIf="mode === 'stocks'">{{ labels.status }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of rows">
              <td><input type="checkbox" /></td>
              <td>
                <span class="product-cell">
                  <img [src]="row.avatar" alt="" />
                  {{ row.name }}
                </span>
              </td>
              <td>{{ row.sku }}</td>
              <td *ngIf="mode === 'products'">{{ row.category }}</td>
              <td *ngIf="mode === 'products'">{{ row.brand }}</td>
              <td>{{ row.warehouse }}</td>
              <td *ngIf="mode === 'stocks'">{{ row.qty }}</td>
              <td *ngIf="mode === 'stocks'">{{ row.lastUpdated }}</td>
              <td *ngIf="mode === 'expired'">{{ row.expiredDate }}</td>
              <td *ngIf="mode === 'expired'">{{ row.manufacturedDate }}</td>
              <td *ngIf="mode !== 'expired'">
                <span class="status-dot">{{ row.reorderLevel | number: '2.0-0' }}</span>
              </td>
              <td *ngIf="mode === 'stocks'">
                <span class="status-chip" [class]="row.status">{{ statusLabel(row.status) }}</span>
              </td>
              <td class="dots">...</td>
            </tr>
          </tbody>
        </table>
        <div class="pagination">
          {{ startItem }}-{{ endItem }} of {{ totalItems }} {{ labels.items }}
          <span>{{ pageSize }}/page</span>
          <button type="button" [disabled]="currentPage <= 1" (click)="goToPage(currentPage - 1)">‹</button>
          <button
            type="button"
            *ngFor="let page of visiblePages"
            [class.active]="page === currentPage"
            (click)="goToPage(page)"
          >
            {{ page }}
          </button>
          <button type="button" [disabled]="currentPage >= totalPages" (click)="goToPage(currentPage + 1)">›</button>
        </div>
      </article>
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }
    .page-heading,
    .table-toolbar {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin-bottom: 26px;
    }
    h1,
    h2 {
      margin: 0;
    }
    h1 {
      font-size: 1.55rem;
    }
    .heading-actions,
    .toolbar-actions {
      display: flex;
      gap: 14px;
    }
    .primary-button,
    .secondary-button,
    .filter-button {
      border-radius: 6px;
      cursor: pointer;
      font: inherit;
      min-height: 42px;
      padding: 0 16px;
    }
    .primary-button {
      background: #08aeb8;
      border: 1px solid #08aeb8;
      color: #ffffff;
      font-weight: 700;
    }
    .secondary-button {
      background: #ff5c35;
      border: 1px solid #ff5c35;
      color: #ffffff;
      font-weight: 700;
    }
    .filter-button {
      background: var(--panel, #ffffff);
      border: 1px solid var(--line, #e8eaed);
      color: inherit;
    }
    .panel {
      background: var(--panel, #ffffff);
      border: 1px solid var(--line, #e8eaed);
      border-radius: 8px;
      overflow: hidden;
    }
    .table-toolbar {
      margin-bottom: 0;
      padding: 22px 26px;
    }
    .table-search {
      align-items: center;
      border: 1px solid var(--line, #e8eaed);
      border-radius: 6px;
      display: flex;
      gap: 8px;
      min-width: 320px;
      padding: 0 12px;
    }
    .table-search input {
      background: transparent;
      border: 0;
      color: inherit;
      font: inherit;
      height: 42px;
      outline: none;
      width: 100%;
    }
    table {
      border-collapse: collapse;
      min-width: 920px;
      width: 100%;
    }
    th,
    td {
      border-top: 1px solid var(--line, #e8eaed);
      color: #5f646b;
      font-size: 0.93rem;
      padding: 14px 18px;
      text-align: left;
      vertical-align: middle;
      white-space: nowrap;
    }
    th {
      background: rgba(0, 0, 0, 0.012);
      font-weight: 600;
    }
    .product-cell {
      align-items: center;
      display: inline-flex;
      gap: 10px;
    }
    .product-cell img {
      border-radius: 999px;
      height: 26px;
      width: 26px;
    }
    .status-dot {
      background: #ff5159;
      border-radius: 999px;
      color: #ffffff;
      display: inline-flex;
      font-size: 0.78rem;
      justify-content: center;
      min-width: 30px;
      padding: 4px 8px;
    }
    .status-chip {
      border-radius: 999px;
      display: inline-flex;
      padding: 4px 10px;
    }
    .status-chip.inStock {
      background: #e4f8ef;
      color: #12a66b;
    }
    .status-chip.lowStock,
    .status-chip.critical {
      background: #ffe7eb;
      color: #ff4d57;
    }
    .status-chip.reorderSoon {
      background: #fff4d9;
      color: #f4a000;
    }
    .status-chip.outOfStock {
      background: #eeeeee;
      color: #6c7077;
    }
    .dots {
      text-align: right;
    }
    .pagination {
      align-items: center;
      color: #8c9198;
      display: flex;
      gap: 16px;
      padding: 22px 26px;
    }
    .pagination button {
      background: transparent;
      border: 0;
      border-radius: 6px;
      color: inherit;
      cursor: pointer;
      font: inherit;
      min-width: 32px;
      padding: 8px 10px;
    }
    .pagination button.active {
      background: #e9fbfc;
      color: #08aeb8;
      font-weight: 800;
    }
    .pagination button:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }
    .pagination input {
      border: 1px solid var(--line, #e8eaed);
      border-radius: 6px;
      height: 32px;
      width: 54px;
    }
    :host-context(.dark-theme) td,
    :host-context(.dark-theme) th {
      color: #c9d2df;
    }
    :host-context(.dark-theme) th {
      background: rgba(255, 255, 255, 0.03);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryListComponent {
  @Input() public title = '';
  @Input() public cardTitle = '';
  @Input() public primaryLabel = '';
  @Input() public secondaryLabel = '';
  @Input() public rows: InventoryListRow[] = [];
  @Input() public labels: InventoryListLabels = DEFAULT_LABELS;
  @Input() public mode: InventoryListMode = 'products';
  @Input() public totalItems = 0;
  @Input() public currentPage = 1;
  @Input() public pageSize = 10;
  @Output() public readonly primary = new EventEmitter<void>();
  @Output() public readonly pageChange = new EventEmitter<number>();

  public get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  public get startItem(): number {
    if (this.totalItems === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  public get endItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  public get visiblePages(): number[] {
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, start + 4);
    const adjustedStart = Math.max(1, end - 4);
    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
  }

  public goToPage(page: number): void {
    const nextPage = Math.min(Math.max(1, page), this.totalPages);
    if (nextPage !== this.currentPage) {
      this.pageChange.emit(nextPage);
    }
  }

  public statusLabel(status: InventoryStockStatus): string {
    const statusMap: Record<InventoryStockStatus, keyof InventoryListLabels> = {
      critical: 'critical',
      inStock: 'inStock',
      lowStock: 'lowStock',
      outOfStock: 'outOfStock',
      reorderSoon: 'reorderSoon',
    };

    return this.labels[statusMap[status]];
  }
}
