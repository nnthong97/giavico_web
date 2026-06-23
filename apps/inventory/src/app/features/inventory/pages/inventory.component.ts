import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { InventoryListComponent } from '../ui/inventory-list.component';
import { AppLanguage, LanguageService } from '../../../core/i18n/language.service';
import { ThemeService } from '../../../core/theme/theme.service';

import {
  GIAVICO_CODE_SHEET_VERSION,
  GIAVICO_INVENTORY_PRODUCTS,
} from '../data-access/giavico-inventory-products';

type InventoryView = 'dashboard' | 'products' | 'categories' | 'stocks' | 'expired' | 'create';
type ProductTab = 'info' | 'pricing' | 'images';
type StockStatus = 'inStock' | 'reorderSoon' | 'lowStock' | 'outOfStock' | 'critical';
type CategoryStatus = 'active' | 'inactive';
type InventoryMetricTone = 'ok' | 'warn' | 'danger';

interface InventoryProduct {
  name: string;
  sku: string;
  category: string;
  brand: string;
  warehouse: string;
  qty: number;
  reorderLevel: number;
  status: StockStatus;
  avatar: string;
  lastUpdated: string;
  expiredDate: string;
  manufacturedDate: string;
}

interface InventoryCategory {
  name: string;
  createdOn: string;
  description: string;
  createdBy: string;
  status: CategoryStatus;
}

interface InventoryMetric {
  value: string;
  label: keyof InventoryTranslation;
  caption: keyof InventoryTranslation;
  icon: string;
  tone: InventoryMetricTone;
}

interface InventoryTranslation {
  active: string;
  addCategories: string;
  addProduct: string;
  allProducts: string;
  apparel: string;
  availableQty: string;
  brand: string;
  cancel: string;
  categories: string;
  categoriesAtRisk: string;
  categoriesList: string;
  category: string;
  codeSheetVersion: string;
  createdBy: string;
  createdOn: string;
  createProduct: string;
  critical: string;
  dashboard: string;
  description: string;
  discountType: string;
  discountValue: string;
  dropUpload: string;
  electronics: string;
  enterDiscountValue: string;
  enterPrice: string;
  enterProductName: string;
  enterQuantity: string;
  enterReorderLevel: string;
  enterSku: string;
  expiredDate: string;
  expiredStocks: string;
  expiredStocksList: string;
  exportProduct: string;
  filter: string;
  footwear: string;
  goTo: string;
  healthy: string;
  images: string;
  inactive: string;
  inStock: string;
  inStockValue: string;
  inventoryRiskIndicator: string;
  inventoryValueAtRisk: string;
  items: string;
  itemsLowOnStock: string;
  lastUpdatedOn: string;
  low: string;
  lowStock: string;
  lowStockItems: string;
  manufacturedDate: string;
  maximumImages: string;
  maximumWords: string;
  needAttention: string;
  next: string;
  outOfStock: string;
  outOfStocks: string;
  pageSize: string;
  price: string;
  pricingStock: string;
  product: string;
  productInfo: string;
  productList: string;
  productName: string;
  products: string;
  purchaseOrders: string;
  qty: string;
  quantity: string;
  reorder: string;
  reorderLevel: string;
  reorderRecommended: string;
  reorderSoon: string;
  reports: string;
  salesOrders: string;
  search: string;
  selectBrand: string;
  selectCategory: string;
  selectDate: string;
  selectDiscountType: string;
  selectSellingType: string;
  selectTaxType: string;
  selectUnit: string;
  selectWarehouse: string;
  sellingType: string;
  settings: string;
  sku: string;
  stockAdjustment: string;
  stockIn: string;
  stockList: string;
  stockMovementOverview: string;
  stockOut: string;
  stocks: string;
  status: string;
  supplier: string;
  taxType: string;
  tickets: string;
  todaySubtitle: string;
  totalProducts: string;
  unit: string;
  upload: string;
  userManagement: string;
  warehouse: string;
  welcome: string;
}

const INVENTORY_TRANSLATIONS: Record<AppLanguage, InventoryTranslation> = {
  en: {
    active: 'Active',
    addCategories: 'Add Categories',
    addProduct: 'Add Fruit',
    allProducts: 'Fruits',
    apparel: 'Berries',
    availableQty: 'Available Qty',
    brand: 'Brand',
    cancel: 'Cancel',
    categories: 'Categories',
    categoriesAtRisk: 'Categories at Risk',
    categoriesList: 'Categories List',
    category: 'Category',
    codeSheetVersion: 'Code Sheet Version',
    createdBy: 'Created by',
    createdOn: 'Created On',
    createProduct: 'Create Fruit',
    critical: 'Critical',
    dashboard: 'Dashboard',
    description: 'Description',
    discountType: 'Discount Type',
    discountValue: 'Discount Value',
    dropUpload: 'Drop here to attach or upload',
    electronics: 'Fresh Fruit',
    enterDiscountValue: 'Enter the Discount Value',
    enterPrice: 'Enter the Price',
    enterProductName: 'Enter the Fruit Name',
    enterQuantity: 'Enter the Quantity',
    enterReorderLevel: 'Enter the Reorder Level',
    enterSku: 'Enter SKU',
    expiredDate: 'Expired Date',
    expiredStocks: 'Expired Stocks',
    expiredStocksList: 'Expired Stocks list',
    exportProduct: 'Export Fruit',
    filter: 'Filter',
    footwear: 'Citrus',
    goTo: 'Go to',
    healthy: 'Healthy',
    images: 'Images',
    inactive: 'Inactive',
    inStock: 'In Stock',
    inStockValue: 'In Stock Value',
    inventoryRiskIndicator: 'Inventory Risk Indicator',
    inventoryValueAtRisk: 'Inventory value at risk',
    items: 'items',
    itemsLowOnStock: 'items low on stock',
    lastUpdatedOn: 'Last Updated on',
    low: 'Low',
    lowStock: 'Low Stock',
    lowStockItems: 'Low Stock Items',
    manufacturedDate: 'Manufactured Date',
    maximumImages: 'Maximum 20 Images',
    maximumWords: 'Maximum 60 Words',
    needAttention: 'Need Attention',
    next: 'Next',
    outOfStock: 'Out of Stock',
    outOfStocks: 'Out of Stocks',
    pageSize: '10/page',
    price: 'Price',
    pricingStock: 'Pricing & Stock',
    product: 'Fruit',
    productInfo: 'Fruit Info',
    productList: 'Fruit List',
    productName: 'Fruit Name',
    products: 'Fruits',
    purchaseOrders: 'Purchase Orders',
    qty: 'Qty',
    quantity: 'Quantity',
    reorder: 'Reorder',
    reorderLevel: 'Reorder level',
    reorderRecommended: 'Reorder recommended',
    reorderSoon: 'Reorder Soon',
    reports: 'Reports',
    salesOrders: 'Sales Orders',
    search: 'Search',
    selectBrand: 'Select the Brand',
    selectCategory: 'Select the Category',
    selectDate: 'Select the Date',
    selectDiscountType: 'Select the Discount type',
    selectSellingType: 'Select the Selling type',
    selectTaxType: 'Select the Tax type',
    selectUnit: 'Select the Unit',
    selectWarehouse: 'Select the Warehouse',
    sellingType: 'Selling type',
    settings: 'Settings',
    sku: 'SKU',
    stockAdjustment: 'Stock Adjustment',
    stockIn: 'Stock In',
    stockList: 'Stock list',
    stockMovementOverview: 'Stock Movement Overview',
    stockOut: 'Stock Out',
    stocks: 'Stocks',
    status: 'Status',
    supplier: 'Supplier',
    taxType: 'Tax Type',
    tickets: 'Tickets',
    todaySubtitle: "Here is what's happening with your fruit stock today.",
    totalProducts: 'Total Fruits',
    unit: 'Unit',
    upload: 'Upload',
    userManagement: 'User Management',
    warehouse: 'Warehouse',
    welcome: 'Welcome, Alex',
  },
  vi: {
    active: 'Hoạt động',
    addCategories: 'Thêm danh mục',
    addProduct: 'Thêm trái cây',
    allProducts: 'Trái cây',
    apparel: 'Quả mọng',
    availableQty: 'Số lượng có sẵn',
    brand: 'Thương hiệu',
    cancel: 'Hủy',
    categories: 'Danh mục',
    categoriesAtRisk: 'Danh mục có rủi ro',
    categoriesList: 'Danh sách danh mục',
    category: 'Danh mục',
    codeSheetVersion: 'Phiên bản bảng mã',
    createdBy: 'Người tạo',
    createdOn: 'Ngày tạo',
    createProduct: 'Tạo trái cây',
    critical: 'Nghiêm trọng',
    dashboard: 'Bảng điều khiển',
    description: 'Mô tả',
    discountType: 'Loại giảm giá',
    discountValue: 'Giá trị giảm giá',
    dropUpload: 'Kéo thả hoặc tải lên',
    electronics: 'Trái cây tươi',
    enterDiscountValue: 'Nhập giá trị giảm giá',
    enterPrice: 'Nhập giá',
    enterProductName: 'Nhập tên trái cây',
    enterQuantity: 'Nhập số lượng',
    enterReorderLevel: 'Nhập mức đặt lại',
    enterSku: 'Nhập SKU',
    expiredDate: 'Ngày hết hạn',
    expiredStocks: 'Hàng hết hạn',
    expiredStocksList: 'Danh sách hàng hết hạn',
    exportProduct: 'Xuất trái cây',
    filter: 'Lọc',
    footwear: 'Cam quýt',
    goTo: 'Đi đến',
    healthy: 'Ổn định',
    images: 'Hình ảnh',
    inactive: 'Không hoạt động',
    inStock: 'Còn hàng',
    inStockValue: 'Giá trị tồn kho',
    inventoryRiskIndicator: 'Chỉ báo rủi ro tồn kho',
    inventoryValueAtRisk: 'Giá trị tồn kho có rủi ro',
    items: 'mục',
    itemsLowOnStock: 'mục sắp hết hàng',
    lastUpdatedOn: 'Cập nhật lần cuối',
    low: 'Thấp',
    lowStock: 'Tồn kho thấp',
    lowStockItems: 'Mặt hàng tồn kho thấp',
    manufacturedDate: 'Ngày sản xuất',
    maximumImages: 'Tối đa 20 hình ảnh',
    maximumWords: 'Tối đa 60 từ',
    needAttention: 'Cần chú ý',
    next: 'Tiếp theo',
    outOfStock: 'Hết hàng',
    outOfStocks: 'Hàng hết tồn',
    pageSize: '10/trang',
    price: 'Giá',
    pricingStock: 'Giá & tồn kho',
    product: 'Trái cây',
    productInfo: 'Thông tin trái cây',
    productList: 'Danh sách trái cây',
    productName: 'Tên trái cây',
    products: 'Trái cây',
    purchaseOrders: 'Đơn mua hàng',
    qty: 'SL',
    quantity: 'Số lượng',
    reorder: 'Đặt lại',
    reorderLevel: 'Mức đặt lại',
    reorderRecommended: 'Khuyến nghị đặt lại',
    reorderSoon: 'Sắp đặt lại',
    reports: 'Báo cáo',
    salesOrders: 'Đơn bán hàng',
    search: 'Tìm kiếm',
    selectBrand: 'Chọn thương hiệu',
    selectCategory: 'Chọn danh mục',
    selectDate: 'Chọn ngày',
    selectDiscountType: 'Chọn loại giảm giá',
    selectSellingType: 'Chọn loại bán',
    selectTaxType: 'Chọn loại thuế',
    selectUnit: 'Chọn đơn vị',
    selectWarehouse: 'Chọn kho',
    sellingType: 'Loại bán',
    settings: 'Cài đặt',
    sku: 'SKU',
    stockAdjustment: 'Điều chỉnh tồn kho',
    stockIn: 'Nhập kho',
    stockList: 'Danh sách tồn kho',
    stockMovementOverview: 'Tổng quan biến động tồn kho',
    stockOut: 'Xuất kho',
    stocks: 'Tồn kho',
    status: 'Trạng thái',
    supplier: 'Nhà cung cấp',
    taxType: 'Loại thuế',
    tickets: 'Phiếu hỗ trợ',
    todaySubtitle: 'Tình hình tồn kho trái cây hôm nay của bạn.',
    totalProducts: 'Tổng trái cây',
    unit: 'Đơn vị',
    upload: 'Tải lên',
    userManagement: 'Quản lý người dùng',
    warehouse: 'Kho',
    welcome: 'Chào mừng, Alex',
  },
  'zh-TW': {
    active: '啟用',
    addCategories: '新增分類',
    addProduct: '新增水果',
    allProducts: '水果',
    apparel: '莓果',
    availableQty: '可用數量',
    brand: '品牌',
    cancel: '取消',
    categories: '分類',
    categoriesAtRisk: '風險分類',
    categoriesList: '分類清單',
    category: '分類',
    codeSheetVersion: '編碼表版本',
    createdBy: '建立者',
    createdOn: '建立日期',
    createProduct: '建立水果',
    critical: '嚴重',
    dashboard: '儀表板',
    description: '描述',
    discountType: '折扣類型',
    discountValue: '折扣值',
    dropUpload: '拖曳或上傳檔案',
    electronics: '新鮮水果',
    enterDiscountValue: '輸入折扣值',
    enterPrice: '輸入價格',
    enterProductName: '輸入水果名稱',
    enterQuantity: '輸入數量',
    enterReorderLevel: '輸入補貨水位',
    enterSku: '輸入 SKU',
    expiredDate: '到期日',
    expiredStocks: '過期庫存',
    expiredStocksList: '過期庫存清單',
    exportProduct: '匯出水果',
    filter: '篩選',
    footwear: '柑橘類',
    goTo: '前往',
    healthy: '健康',
    images: '圖片',
    inactive: '停用',
    inStock: '有庫存',
    inStockValue: '庫存價值',
    inventoryRiskIndicator: '庫存風險指標',
    inventoryValueAtRisk: '有風險的庫存價值',
    items: '項',
    itemsLowOnStock: '項低庫存',
    lastUpdatedOn: '最後更新',
    low: '低',
    lowStock: '低庫存',
    lowStockItems: '低庫存品項',
    manufacturedDate: '製造日期',
    maximumImages: '最多 20 張圖片',
    maximumWords: '最多 60 個字',
    needAttention: '需要注意',
    next: '下一步',
    outOfStock: '缺貨',
    outOfStocks: '缺貨商品',
    pageSize: '10/頁',
    price: '價格',
    pricingStock: '價格與庫存',
    product: '水果',
    productInfo: '水果資訊',
    productList: '水果清單',
    productName: '水果名稱',
    products: '水果',
    purchaseOrders: '採購訂單',
    qty: '數量',
    quantity: '數量',
    reorder: '補貨',
    reorderLevel: '補貨水位',
    reorderRecommended: '建議補貨',
    reorderSoon: '即將補貨',
    reports: '報表',
    salesOrders: '銷售訂單',
    search: '搜尋',
    selectBrand: '選擇品牌',
    selectCategory: '選擇分類',
    selectDate: '選擇日期',
    selectDiscountType: '選擇折扣類型',
    selectSellingType: '選擇銷售類型',
    selectTaxType: '選擇稅別',
    selectUnit: '選擇單位',
    selectWarehouse: '選擇倉庫',
    sellingType: '銷售類型',
    settings: '設定',
    sku: 'SKU',
    stockAdjustment: '庫存調整',
    stockIn: '入庫',
    stockList: '庫存清單',
    stockMovementOverview: '庫存流動概覽',
    stockOut: '出庫',
    stocks: '庫存',
    status: '狀態',
    supplier: '供應商',
    taxType: '稅別',
    tickets: '票券',
    todaySubtitle: '以下是今日水果庫存狀況。',
    totalProducts: '水果總數',
    unit: '單位',
    upload: '上傳',
    userManagement: '使用者管理',
    warehouse: '倉庫',
    welcome: '歡迎，Alex',
  },
};


const PRODUCTS: InventoryProduct[] = GIAVICO_INVENTORY_PRODUCTS;

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Apple: 'Apple product codes from the Giavico Vietnam code sheet, including AP, JU, RD, KQ, AE, and CJ.',
  Banana: 'Banana inventory mapped from product code BN.',
  Berry: 'Berry-related product codes including SB, BB, BC, RN, RP, MB, BK, and AI.',
  Citrus: 'Citrus product codes including OL, OM, OP, OT, LE, LM, PO, and YU.',
  Coconut: 'Coconut and coconut water codes CO, CN, and CP from the Vietnam sheet.',
  'Functional Ingredient': 'Functional ingredient and prepared product codes from the same code sheet.',
  Grape: 'Grape product codes GR, GW, GF, and GU.',
  Guava: 'Guava variants from the Vietnam product code sheet, including GT, GA, and GV.',
  'Herb & Flower': 'Herbal and floral materials such as tea herbs, flowers, and botanical inputs.',
  Lychee: 'Lychee and longan-related product codes.',
  Mango: 'Mango product codes such as MG and MA.',
  Melon: 'Melon and watermelon product codes ML and WM.',
  Nata: 'Nata product codes ND and NC, plus CP2, CP4, CP6, CP9, and CP10 variants.',
  Other: 'Other product codes preserved from the Giavico Vietnam source sheet.',
  Plum: 'Plum and preserved plum product codes.',
  'Seed & Grain': 'Seed, nut, grain, and legume codes from the source sheet.',
  'Tea & Beverage': 'Drink and infusion codes such as GP, EE, CD, IT, KB, and YO.',
  Tropical: 'Tropical fruit codes such as PN, PY, DF, RT, MN, DR, and JF.',
  Vegetable: 'Vegetable and plant-based ingredient codes from the source sheet.',
};

const CATEGORIES: InventoryCategory[] = Array.from(
  new Set(PRODUCTS.map((product) => product.category))
)
  .sort((a, b) => a.localeCompare(b))
  .map((name, index) => ({
    name,
    createdOn: 'March 11, 2024',
    description:
      CATEGORY_DESCRIPTIONS[name] ??
      'Imported from Giavico Vietnam product code sheet version 67.',
    createdBy: 'Giavico Vietnam',
    status: index % 5 === 0 ? 'inactive' : 'active',
  }));

@Component({
  selector: 'giavico-inventory-management',
  standalone: true,
  imports: [CommonModule, InventoryListComponent],
  template: `
    <div class="inventory-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">F</div>
          <strong>Fruitwise</strong>
          <button type="button" class="icon-button compact" aria-label="Collapse menu">‹</button>
        </div>

        <nav class="nav-list" aria-label="Inventory navigation">
          <button type="button" class="nav-item" [class.active]="view() === 'dashboard'" (click)="setView('dashboard')">
            <span class="nav-icon">▦</span>{{ tr('dashboard') }}
          </button>
          <button type="button" class="nav-item" [class.active]="view() === 'products' || view() === 'create'" (click)="setView('products')">
            <span class="nav-icon">⬡</span>{{ tr('products') }}<span class="nav-caret">⌄</span>
          </button>
          <button type="button" class="nav-item muted">
            <span class="nav-icon">▢</span>{{ tr('purchaseOrders') }}
          </button>
          <button type="button" class="nav-item muted">
            <span class="nav-icon">▱</span>{{ tr('salesOrders') }}
          </button>
          <button type="button" class="nav-item" [class.active]="view() === 'stocks' || view() === 'expired'" (click)="setView('stocks')">
            <span class="nav-icon">▤</span>{{ tr('stocks') }}<span class="nav-caret">⌄</span>
          </button>
          <button type="button" class="nav-item muted">
            <span class="nav-icon">▭</span>{{ tr('warehouse') }}
          </button>
          <button type="button" class="nav-item muted">
            <span class="nav-icon">♙</span>{{ tr('supplier') }}
          </button>
          <button type="button" class="nav-item muted">
            <span class="nav-icon">▥</span>{{ tr('reports') }}<span class="nav-caret">⌄</span>
          </button>
          <button type="button" class="nav-item muted">
            <span class="nav-icon">♧</span>{{ tr('userManagement') }}<span class="nav-caret">⌄</span>
          </button>
          <button type="button" class="nav-item muted">
            <span class="nav-icon">⌘</span>{{ tr('tickets') }}
          </button>
          <button type="button" class="nav-item muted">
            <span class="nav-icon">⚙</span>{{ tr('settings') }}<span class="nav-caret">⌄</span>
          </button>
        </nav>
      </aside>

      <main class="main">
        <header class="topbar">
          <label class="global-search">
            <input type="search" [placeholder]="tr('search')" [value]="search()" (input)="search.set($any($event.target).value)" />
            <span>⌕</span>
          </label>

          <div class="top-actions">
            <label class="select-control">
              <span>{{ languageService.translate('language') }}</span>
              <select [value]="languageService.language()" (change)="setLanguage($any($event.target).value)">
                <option value="en">EN</option>
                <option value="zh-TW">繁中</option>
                <option value="vi">VI</option>
              </select>
            </label>
            <button type="button" class="pill-button ghost" (click)="toggleTheme()">
              {{ themeService.theme() === 'dark' ? languageService.translate('lightMode') : languageService.translate('darkMode') }}
            </button>
            <button type="button" class="bell" aria-label="Notifications">♟<span></span></button>
            <img class="profile" src="https://i.pravatar.cc/72?img=59" alt="Alex" />
          </div>
        </header>

        <section class="content">
          <ng-container [ngSwitch]="view()">
            <ng-container *ngSwitchCase="'dashboard'">
              <div class="page-heading">
                <div>
                  <h1>{{ tr('welcome') }}</h1>
                  <p>{{ tr('todaySubtitle') }}</p>
                </div>
              </div>
              <div class="metric-grid">
                <article class="metric-card" *ngFor="let metric of dashboardMetrics">
                  <div>
                    <strong>{{ metric.value }}</strong>
                    <span>{{ tr(metric.label) }}</span>
                  </div>
                  <span class="metric-icon" [class.warn]="metric.tone === 'warn'" [class.danger]="metric.tone === 'danger'">{{ metric.icon }}</span>
                  <p>{{ tr(metric.caption) }}</p>
                </article>
              </div>
              <div class="dashboard-grid">
                <article class="panel movement-panel">
                  <div class="panel-header">
                    <h2>{{ tr('stockMovementOverview') }}</h2>
                    <button class="pill-button ghost" type="button">▣ This Year⌄</button>
                  </div>
                  <div class="bar-chart" aria-label="Stock movement chart">
                    <div class="axis">
                      <span>60K</span><span>50K</span><span>40K</span><span>30K</span><span>20K</span><span>10K</span><span>0</span>
                    </div>
                    <div class="bars">
                      <div *ngFor="let month of movement">
                        <span class="bar-in" [style.height.%]="month.in"></span>
                        <span class="bar-out" [style.height.%]="month.out"></span>
                        <small>{{ month.label }}</small>
                      </div>
                    </div>
                  </div>
                  <div class="chart-legend">
                    <span><i class="dot pale"></i>{{ tr('stockIn') }} /49K unit</span>
                    <span><i class="dot accent"></i>{{ tr('stockOut') }} 50K unit</span>
                  </div>
                </article>
                <article class="panel out-panel">
                  <h2>{{ tr('outOfStocks') }}</h2>
                  <div class="reorder-row" *ngFor="let item of outOfStockItems">
                    <div>
                      <strong>{{ item }}</strong>
                      <span>Fresh Fruit</span>
                    </div>
                    <button type="button">{{ tr('reorder') }} →</button>
                  </div>
                </article>
              </div>
              <section class="panel table-panel">
                <h2>{{ tr('lowStock') }}</h2>
                <table>
                  <thead>
                    <tr>
                      <th>{{ tr('product') }}</th>
                      <th>{{ tr('category') }}</th>
                      <th>{{ tr('sku') }}</th>
                      <th>{{ tr('warehouse') }}</th>
                      <th>{{ tr('qty') }}</th>
                      <th>{{ tr('reorderLevel') }}</th>
                      <th>{{ tr('status') }}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let product of lowStockProducts">
                      <td><span class="product-cell"><img [src]="product.avatar" alt="" />{{ product.name }}</span></td>
                      <td>{{ product.category }}</td>
                      <td>{{ product.sku }}</td>
                      <td>{{ product.warehouse }}</td>
                      <td>{{ product.qty }}</td>
                      <td>{{ product.reorderLevel }}</td>
                      <td><span class="status-chip" [class]="product.status">{{ statusLabel(product.status) }}</span></td>
                      <td class="dots">⋮</td>
                    </tr>
                  </tbody>
                </table>
              </section>
              <div class="risk-grid">
                <article class="panel">
                  <h2>{{ tr('inventoryRiskIndicator') }}</h2>
                  <div class="donut inventory"></div>
                  <div class="risk-list">
                    <span><i class="dot green"></i>{{ tr('healthy') }}<small>Enough Stock to meet demands</small></span>
                    <span><i class="dot orange"></i>{{ tr('needAttention') }}<small>Certain items are low on stocks</small></span>
                    <span><i class="dot red"></i>{{ tr('critical') }}<small>Immediate restock required</small></span>
                  </div>
                </article>
                <article class="panel">
                  <h2>{{ tr('categoriesAtRisk') }}</h2>
                  <div class="donut categories-donut"></div>
                  <div class="risk-list">
                    <span><i class="dot purple"></i>Citrus<small>3 {{ tr('itemsLowOnStock') }}</small></span>
                    <span><i class="dot accent"></i>Tropical<small>4 {{ tr('itemsLowOnStock') }}</small></span>
                    <span><i class="dot coral"></i>Apple<small>1 {{ tr('outOfStock') }}</small></span>
                  </div>
                </article>
              </div>
            </ng-container>

            <ng-container *ngSwitchCase="'products'">
              <app-inventory-list
                [title]="tr('allProducts')"
                [cardTitle]="tr('productList')"
                [primaryLabel]="tr('addProduct')"
                [secondaryLabel]="tr('exportProduct')"
                [rows]="pagedProducts()"
                [labels]="labels()"
                [totalItems]="filteredProducts().length"
                [currentPage]="productsPage()"
                [pageSize]="pageSize"
                mode="products"
                (primary)="setView('create')"
                (pageChange)="setProductsPage($event)"
              ></app-inventory-list>
            </ng-container>

            <ng-container *ngSwitchCase="'categories'">
              <section class="list-page">
                <div class="page-heading">
                  <h1>{{ tr('categories') }}</h1>
                  <button class="primary-button" type="button">＋ {{ tr('addCategories') }}</button>
                </div>
                <article class="panel table-panel">
                  <div class="table-toolbar">
                    <h2>{{ tr('categoriesList') }}</h2>
                    <div class="toolbar-actions">
                      <label class="table-search"><span>⌕</span><input type="search" [placeholder]="tr('search')" /></label>
                      <button type="button" class="filter-button">▽ {{ tr('filter') }}</button>
                    </div>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th><input type="checkbox" /></th>
                        <th>{{ tr('category') }}</th>
                        <th>{{ tr('createdOn') }}</th>
                        <th>{{ tr('description') }}</th>
                        <th>{{ tr('createdBy') }}</th>
                        <th>{{ tr('status') }}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let category of categories">
                        <td><input type="checkbox" /></td>
                        <td>{{ category.name }}</td>
                        <td>{{ category.createdOn }}</td>
                        <td class="truncate">{{ category.description }}</td>
                        <td>{{ category.createdBy }}</td>
                        <td><span class="status-chip" [class]="category.status">{{ categoryStatusLabel(category.status) }}</span></td>
                        <td class="row-actions">□ 🗑</td>
                      </tr>
                    </tbody>
                  </table>
                  <div class="pagination">1-10 of 85 {{ tr('items') }} <span>{{ tr('pageSize') }}⌄</span><b>‹</b><span>1</span><strong>2</strong><span>3</span><span>4</span><span>5</span><span>...</span><span>50</span><b>›</b><span>{{ tr('goTo') }}</span><input /></div>
                </article>
              </section>
            </ng-container>

            <ng-container *ngSwitchCase="'stocks'">
              <app-inventory-list
                [title]="tr('stocks')"
                [cardTitle]="tr('stockList')"
                [primaryLabel]="tr('stockAdjustment')"
                [rows]="pagedStocks()"
                [labels]="labels()"
                [totalItems]="filteredProducts().length"
                [currentPage]="stocksPage()"
                [pageSize]="pageSize"
                mode="stocks"
                (pageChange)="setStocksPage($event)"
              ></app-inventory-list>
            </ng-container>

            <ng-container *ngSwitchCase="'expired'">
              <app-inventory-list
                [title]="tr('expiredStocks')"
                [cardTitle]="tr('expiredStocksList')"
                [primaryLabel]="tr('stockAdjustment')"
                [rows]="pagedExpired()"
                [labels]="labels()"
                [totalItems]="filteredProducts().length"
                [currentPage]="expiredPage()"
                [pageSize]="pageSize"
                mode="expired"
                (pageChange)="setExpiredPage($event)"
              ></app-inventory-list>
            </ng-container>

            <ng-container *ngSwitchCase="'create'">
              <section class="create-page">
                <div class="page-heading stacked">
                  <h1>{{ tr('createProduct') }}</h1>
                  <p>{{ tr('products') }} › <strong>{{ tr('createProduct') }}</strong></p>
                </div>
                <article class="panel form-panel">
                  <div class="tabs">
                    <button type="button" [class.active]="productTab() === 'info'" (click)="productTab.set('info')">{{ tr('productInfo') }}</button>
                    <button type="button" [class.active]="productTab() === 'pricing'" (click)="productTab.set('pricing')">{{ tr('pricingStock') }}</button>
                    <button type="button" [class.active]="productTab() === 'images'" (click)="productTab.set('images')">{{ tr('images') }}</button>
                  </div>

                  <div *ngIf="productTab() === 'info'" class="form-grid">
                    <label>{{ tr('warehouse') }} *<select><option>{{ tr('selectWarehouse') }}</option></select></label>
                    <label>{{ tr('productName') }} *<input [placeholder]="tr('enterProductName')" /></label>
                    <label>{{ tr('sku') }} *<input [placeholder]="tr('enterSku')" /></label>
                    <label>{{ tr('sellingType') }} *<select><option>{{ tr('selectSellingType') }}</option></select></label>
                    <label>{{ tr('category') }} *<select><option>{{ tr('selectCategory') }}</option></select></label>
                    <label>{{ tr('brand') }} *<select><option>{{ tr('selectBrand') }}</option></select></label>
                    <label>{{ tr('quantity') }} *<select><option>{{ tr('selectUnit') }}</option></select></label>
                    <label>{{ tr('unit') }} *<select><option>{{ tr('selectUnit') }}</option></select></label>
                    <label>{{ tr('manufacturedDate') }} *<input [placeholder]="tr('selectDate')" /></label>
                    <label>{{ tr('expiredDate') }} *<input [placeholder]="tr('selectDate')" /></label>
                    <label class="wide">{{ tr('description') }}<div class="editor"><div>B <i>I</i> U S 🔗 ≡ ☷ 66 &lt;/&gt;</div><textarea placeholder="Type your message"></textarea><small>☺ 🗑</small></div><span>{{ tr('maximumWords') }}</span></label>
                  </div>

                  <div *ngIf="productTab() === 'pricing'" class="form-grid">
                    <label class="wide radio-row">{{ tr('discountValue') }} *<span><input type="radio" /> Single Fruit <input type="radio" /> Mixed Fruit</span></label>
                    <label>{{ tr('quantity') }} *<select><option>{{ tr('enterQuantity') }}</option></select></label>
                    <label>{{ tr('reorderLevel') }} *<input [placeholder]="tr('enterReorderLevel')" /></label>
                    <label>{{ tr('price') }} *<input [placeholder]="tr('enterPrice')" /></label>
                    <label>{{ tr('taxType') }} *<select><option>{{ tr('selectTaxType') }}</option></select></label>
                    <label>{{ tr('discountType') }} *<select><option>{{ tr('selectDiscountType') }}</option></select></label>
                    <label>{{ tr('discountValue') }} *<input [placeholder]="tr('enterDiscountValue')" /></label>
                  </div>

                  <div *ngIf="productTab() === 'images'" class="image-step">
                    <label>{{ tr('upload') }}</label>
                    <div class="upload-box">⇧<span>{{ tr('dropUpload') }}</span><small>{{ tr('maximumImages') }}</small></div>
                    <div class="thumb-row">
                      <div *ngFor="let image of imageCards"><img [src]="image" alt="" /><button type="button">×</button></div>
                    </div>
                  </div>

                  <div class="form-actions">
                    <button type="button" class="pill-button ghost" (click)="setView('products')">{{ tr('cancel') }}</button>
                    <button type="button" class="primary-button">{{ productTab() === 'images' ? tr('addProduct') : tr('next') }}</button>
                  </div>
                </article>
              </section>
            </ng-container>
          </ng-container>
        </section>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 800px;
    }
    .inventory-shell {
      --accent: #08aeb8;
      --danger: #ff5059;
      --line: #e8eaed;
      --muted: #8a9099;
      --page: #f5f5f5;
      --panel: #ffffff;
      --text: #2c2f33;
      background: var(--page);
      color: var(--text);
      display: grid;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      grid-template-columns: 260px minmax(0, 1fr);
      min-height: 100vh;
    }
    .sidebar {
      background: var(--panel);
      border-right: 1px solid var(--line);
      padding: 22px 18px;
    }
    .brand {
      align-items: center;
      display: grid;
      gap: 12px;
      grid-template-columns: 36px 1fr 28px;
      margin-bottom: 44px;
    }
    .brand-mark {
      align-items: center;
      background: #3f70de;
      color: #ffffff;
      display: flex;
      font-size: 24px;
      font-weight: 900;
      height: 36px;
      justify-content: center;
      transform: skew(-6deg);
      width: 36px;
    }
    .brand strong {
      font-size: 1.45rem;
      font-weight: 800;
    }
    .icon-button,
    .bell {
      background: transparent;
      border: 0;
      color: var(--muted);
      cursor: pointer;
      font-size: 1.25rem;
    }
    .nav-list {
      display: grid;
      gap: 8px;
    }
    .nav-item {
      align-items: center;
      background: transparent;
      border: 0;
      border-radius: 8px;
      color: #565b62;
      cursor: pointer;
      display: grid;
      font-size: 0.98rem;
      gap: 14px;
      grid-template-columns: 22px 1fr 18px;
      min-height: 40px;
      padding: 8px 8px;
      text-align: left;
    }
    .nav-item.active,
    .nav-item:hover {
      background: rgba(8, 174, 184, 0.1);
      color: var(--accent);
    }
    .nav-caret {
      color: currentColor;
      font-size: 1rem;
      justify-self: end;
    }
    .main {
      min-width: 0;
    }
    .topbar {
      align-items: center;
      background: var(--panel);
      border-bottom: 1px solid var(--line);
      display: flex;
      height: 72px;
      justify-content: space-between;
      padding: 0 32px;
    }
    .global-search,
    .table-search {
      align-items: center;
      border: 1px solid #dfe3e7;
      border-radius: 6px;
      display: flex;
      gap: 8px;
      height: 42px;
      padding: 0 12px;
    }
    .global-search {
      width: min(360px, 42vw);
    }
    input,
    select,
    textarea {
      background: transparent;
      border: 0;
      color: inherit;
      font: inherit;
      outline: none;
      width: 100%;
    }
    .top-actions {
      align-items: center;
      display: flex;
      gap: 14px;
    }
    .select-control {
      align-items: center;
      color: var(--muted);
      display: flex;
      font-size: 0.82rem;
      gap: 8px;
    }
    .select-control select {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 6px 8px;
      width: auto;
    }
    .profile {
      border-radius: 999px;
      height: 42px;
      width: 42px;
    }
    .bell {
      position: relative;
    }
    .bell span {
      background: var(--danger);
      border-radius: 999px;
      height: 7px;
      position: absolute;
      right: 2px;
      top: 4px;
      width: 7px;
    }
    .content {
      padding: 42px 32px 56px;
    }
    .page-heading {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin-bottom: 26px;
    }
    .page-heading.stacked {
      align-items: flex-start;
      display: block;
    }
    h1,
    h2,
    p {
      margin: 0;
    }
    h1 {
      font-size: 1.55rem;
      font-weight: 800;
    }
    .page-heading p {
      color: var(--muted);
      margin-top: 6px;
    }
    .primary-button,
    .pill-button,
    .filter-button {
      border-radius: 6px;
      cursor: pointer;
      font: inherit;
      min-height: 42px;
      padding: 0 18px;
    }
    .primary-button {
      background: var(--accent);
      border: 1px solid var(--accent);
      color: #ffffff;
      font-weight: 700;
    }
    .pill-button.ghost,
    .filter-button {
      background: var(--panel);
      border: 1px solid #dfe3e7;
      color: #4f5359;
    }
    .metric-grid {
      display: grid;
      gap: 20px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      margin-bottom: 22px;
    }
    .metric-card,
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    }
    .metric-card {
      display: grid;
      gap: 14px;
      grid-template-columns: 1fr 46px;
      padding: 20px;
    }
    .metric-card strong {
      display: block;
      font-size: 1.18rem;
      margin-bottom: 8px;
    }
    .metric-card span,
    .metric-card p,
    td,
    th {
      color: #5f646b;
    }
    .metric-card p {
      border-top: 1px solid var(--line);
      grid-column: 1 / -1;
      padding-top: 14px;
    }
    .metric-icon {
      align-items: center;
      background: #e2f8fa;
      border-radius: 8px;
      color: var(--accent);
      display: flex;
      font-size: 1.25rem;
      height: 46px;
      justify-content: center;
      width: 46px;
    }
    .metric-icon.warn {
      background: #fff2e8;
      color: #ff7a45;
    }
    .metric-icon.danger {
      background: #efedff;
      color: #6c55ff;
    }
    .dashboard-grid {
      display: grid;
      gap: 20px;
      grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
      margin-bottom: 22px;
    }
    .panel {
      overflow: hidden;
    }
    .panel h2,
    .panel-header {
      font-size: 1.12rem;
      font-weight: 800;
      padding: 20px;
    }
    .panel-header {
      align-items: center;
      border-bottom: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
    }
    .bar-chart {
      display: grid;
      gap: 16px;
      grid-template-columns: 42px minmax(0, 1fr);
      height: 260px;
      padding: 28px 24px 8px;
    }
    .axis {
      color: #a6abb2;
      display: flex;
      flex-direction: column;
      font-size: 0.84rem;
      justify-content: space-between;
    }
    .bars {
      align-items: end;
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(12, minmax(24px, 1fr));
    }
    .bars div {
      align-items: end;
      display: grid;
      height: 100%;
      position: relative;
    }
    .bars span {
      border-radius: 8px 8px 0 0;
      bottom: 26px;
      left: 0;
      position: absolute;
      width: 100%;
    }
    .bar-in {
      background: #ddf7f8;
    }
    .bar-out {
      background: #1fbfc7;
      width: 70% !important;
    }
    .bars small {
      align-self: end;
      color: #9ca1a8;
      justify-self: center;
    }
    .chart-legend {
      display: flex;
      gap: 18px;
      justify-content: center;
      padding: 8px 0 24px;
    }
    .dot {
      border-radius: 999px;
      display: inline-block;
      height: 8px;
      margin-right: 8px;
      width: 8px;
    }
    .accent {
      background: var(--accent);
    }
    .pale {
      background: #ddf7f8;
    }
    .green {
      background: #14a66a;
    }
    .orange {
      background: #ff9f1a;
    }
    .red {
      background: #ff333d;
    }
    .purple {
      background: #696ca8;
    }
    .coral {
      background: #ff666d;
    }
    .out-panel {
      padding-bottom: 18px;
    }
    .reorder-row {
      align-items: center;
      border-top: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      margin: 0 20px;
      padding: 14px 0;
    }
    .reorder-row strong,
    .reorder-row span {
      display: block;
    }
    .reorder-row span {
      color: var(--muted);
      font-size: 0.84rem;
      margin-top: 6px;
    }
    .reorder-row button {
      background: var(--accent);
      border: 0;
      border-radius: 4px;
      color: #ffffff;
      cursor: pointer;
      padding: 6px 8px;
    }
    .table-panel {
      margin-bottom: 22px;
    }
    .table-toolbar {
      align-items: center;
      display: flex;
      gap: 16px;
      justify-content: space-between;
      padding: 22px 26px;
    }
    .toolbar-actions {
      display: flex;
      gap: 16px;
    }
    .table-search {
      min-width: 320px;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th,
    td {
      border-top: 1px solid var(--line);
      font-size: 0.93rem;
      padding: 14px 18px;
      text-align: left;
      vertical-align: middle;
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
    .status-chip {
      border-radius: 999px;
      display: inline-flex;
      font-size: 0.82rem;
      justify-content: center;
      min-width: 42px;
      padding: 4px 10px;
    }
    .status-chip.lowStock,
    .status-chip.critical {
      background: #ffe7eb;
      color: #ff4d57;
    }
    .status-chip.inStock,
    .status-chip.active {
      background: #e4f8ef;
      color: #12a66b;
    }
    .status-chip.reorderSoon {
      background: #fff4d9;
      color: #f4a000;
    }
    .status-chip.outOfStock,
    .status-chip.inactive {
      background: #eeeeee;
      color: #6c7077;
    }
    .status-chip.critical {
      color: #ff4d57;
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
    .truncate {
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .dots,
    .row-actions {
      color: #969ba2;
      text-align: right;
    }
    .pagination {
      align-items: center;
      color: #8c9198;
      display: flex;
      gap: 16px;
      padding: 22px 26px;
    }
    .pagination strong {
      background: #e9fbfc;
      border-radius: 6px;
      color: var(--accent);
      padding: 8px 10px;
    }
    .pagination input {
      border: 1px solid #dfe3e7;
      border-radius: 6px;
      height: 32px;
      width: 54px;
    }
    .risk-grid {
      display: grid;
      gap: 20px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .donut {
      border-radius: 999px;
      height: 160px;
      margin: 24px auto;
      width: 160px;
    }
    .donut.inventory {
      background: conic-gradient(#14a66a 0 62%, #ff9f1a 62% 83%, #ff333d 83% 100%);
      mask: radial-gradient(circle at center, transparent 42%, #000 43%);
    }
    .donut.categories-donut {
      background: conic-gradient(#696ca8 0 62%, #08aeb8 62% 84%, #ff666d 84% 100%);
      mask: radial-gradient(circle at center, transparent 42%, #000 43%);
    }
    .risk-list {
      border: 1px solid var(--line);
      border-radius: 8px;
      margin: 0 20px 20px;
      overflow: hidden;
    }
    .risk-list span {
      align-items: center;
      display: grid;
      grid-template-columns: 1fr auto;
      padding: 12px 16px;
    }
    .risk-list span + span {
      border-top: 1px solid var(--line);
    }
    .risk-list small {
      color: #62676e;
    }
    .list-page .page-heading {
      margin-bottom: 26px;
    }
    .create-page {
      max-width: 1460px;
    }
    .form-panel {
      padding: 28px 32px 40px;
    }
    .tabs {
      border-bottom: 1px solid var(--line);
      display: flex;
      gap: 28px;
      margin-bottom: 34px;
      max-width: 520px;
    }
    .tabs button {
      background: transparent;
      border: 0;
      border-bottom: 2px solid transparent;
      color: #62676e;
      cursor: pointer;
      font-size: 1.05rem;
      padding: 0 0 14px;
    }
    .tabs button.active {
      border-bottom-color: var(--accent);
      color: var(--accent);
    }
    .form-grid {
      display: grid;
      gap: 26px 30px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .form-grid label,
    .image-step label {
      color: #5f646b;
      display: grid;
      gap: 10px;
    }
    .form-grid input,
    .form-grid select {
      border: 1px solid #dfe3e7;
      border-radius: 6px;
      height: 46px;
      padding: 0 14px;
    }
    .wide {
      grid-column: 1 / -1;
    }
    .radio-row span {
      align-items: center;
      color: #9ca1a8;
      display: flex;
      gap: 16px;
    }
    .radio-row input {
      height: auto;
      width: auto;
    }
    .editor {
      border: 1px solid #dfe3e7;
      border-radius: 6px;
      min-height: 190px;
      overflow: hidden;
    }
    .editor div {
      border-bottom: 1px solid #dfe3e7;
      color: #6d737b;
      padding: 14px 18px;
      word-spacing: 18px;
    }
    .editor textarea {
      min-height: 110px;
      padding: 18px;
      resize: none;
    }
    .editor small {
      display: block;
      padding: 8px 18px 14px;
      word-spacing: 14px;
    }
    .image-step {
      max-width: 520px;
    }
    .upload-box {
      align-items: center;
      border: 1px dashed #cfd4da;
      border-radius: 6px;
      color: #6c727a;
      display: grid;
      gap: 14px;
      height: 190px;
      justify-items: center;
      margin-top: 12px;
    }
    .upload-box span,
    .upload-box small {
      display: block;
    }
    .thumb-row {
      display: flex;
      gap: 26px;
      margin-top: 18px;
    }
    .thumb-row div {
      border-radius: 6px;
      height: 126px;
      overflow: hidden;
      position: relative;
      width: 126px;
    }
    .thumb-row img {
      height: 100%;
      object-fit: cover;
      width: 100%;
    }
    .thumb-row button {
      background: rgba(0, 0, 0, 0.65);
      border: 0;
      border-radius: 999px;
      color: #ffffff;
      cursor: pointer;
      height: 22px;
      position: absolute;
      right: 8px;
      top: 8px;
      width: 22px;
    }
    .form-actions {
      display: flex;
      gap: 18px;
      justify-content: flex-end;
      margin-top: 48px;
    }
    :host-context(.dark-theme) .inventory-shell {
      --line: #2b3748;
      --muted: #96a1b2;
      --page: #101827;
      --panel: #172235;
      --text: #f4f7fb;
    }
    :host-context(.dark-theme) .nav-item,
    :host-context(.dark-theme) td,
    :host-context(.dark-theme) th,
    :host-context(.dark-theme) .metric-card span,
    :host-context(.dark-theme) .metric-card p,
    :host-context(.dark-theme) .form-grid label,
    :host-context(.dark-theme) .image-step label {
      color: #c9d2df;
    }
    :host-context(.dark-theme) .global-search,
    :host-context(.dark-theme) .table-search,
    :host-context(.dark-theme) .form-grid input,
    :host-context(.dark-theme) .form-grid select,
    :host-context(.dark-theme) .editor,
    :host-context(.dark-theme) .select-control select,
    :host-context(.dark-theme) .pill-button.ghost,
    :host-context(.dark-theme) .filter-button {
      background: #121b2a;
      border-color: #334155;
      color: #f4f7fb;
    }
    :host-context(.dark-theme) th {
      background: rgba(255, 255, 255, 0.03);
    }
    @media (max-width: 1180px) {
      .inventory-shell {
        grid-template-columns: 220px minmax(0, 1fr);
      }
      .metric-grid,
      .risk-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryComponent {
  public readonly themeService = inject(ThemeService);
  public readonly languageService = inject(LanguageService);

  public readonly view = signal<InventoryView>('dashboard');
  public readonly productTab = signal<ProductTab>('info');
  public readonly search = signal('');
  public readonly productsPage = signal(1);
  public readonly stocksPage = signal(1);
  public readonly expiredPage = signal(1);
  public readonly pageSize = 10;
  public readonly products = PRODUCTS;
  public readonly categories = CATEGORIES;
  public readonly imageCards = [
    'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=320&q=80',
    'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=320&q=80',
    'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=320&q=80',
  ];
  public readonly dashboardMetrics: InventoryMetric[] = [
    { value: String(PRODUCTS.length), label: 'totalProducts', caption: 'active', icon: '◈', tone: 'ok' },
    {
      value: String(PRODUCTS.filter((product) => ['critical', 'lowStock'].includes(product.status)).length),
      label: 'lowStockItems',
      caption: 'reorderRecommended',
      icon: '◷',
      tone: 'ok',
    },
    {
      value: String(PRODUCTS.filter((product) => product.status === 'outOfStock').length),
      label: 'outOfStock',
      caption: 'critical',
      icon: '⊗',
      tone: 'warn',
    },
    { value: `V${GIAVICO_CODE_SHEET_VERSION}`, label: 'codeSheetVersion', caption: 'active', icon: '#', tone: 'danger' },
  ];
  public readonly movement = [
    { label: 'Jan', in: 74, out: 22 },
    { label: 'Feb', in: 50, out: 36 },
    { label: 'Mar', in: 34, out: 16 },
    { label: 'Apr', in: 74, out: 22 },
    { label: 'May', in: 58, out: 40 },
    { label: 'Jun', in: 74, out: 22 },
    { label: 'July', in: 36, out: 16 },
    { label: 'Aug', in: 42, out: 28 },
    { label: 'Sep', in: 74, out: 60 },
    { label: 'Oct', in: 48, out: 10 },
    { label: 'Nov', in: 62, out: 46 },
    { label: 'Dec', in: 46, out: 22 },
  ];
  public readonly outOfStockItems = PRODUCTS
    .filter((product) => product.status === 'outOfStock')
    .slice(0, 5)
    .map((product) => `${product.sku} - ${product.name}`);
  public readonly lowStockProducts = PRODUCTS.filter((product) =>
    ['lowStock', 'critical'].includes(product.status)
  );
  public readonly filteredProducts = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) {
      return this.products;
    }

    return this.products.filter((product) =>
      [product.name, product.sku, product.category, product.brand, product.warehouse]
        .some((value) => value.toLowerCase().includes(query))
    );
  });
  public readonly pagedProducts = computed(() =>
    this.paginate(this.filteredProducts(), this.productsPage())
  );
  public readonly pagedStocks = computed(() =>
    this.paginate(this.filteredProducts(), this.stocksPage())
  );
  public readonly pagedExpired = computed(() =>
    this.paginate(this.filteredProducts(), this.expiredPage())
  );

  public labels(): InventoryTranslation {
    return INVENTORY_TRANSLATIONS[this.languageService.language()];
  }

  public setView(view: InventoryView): void {
    this.view.set(view);
  }

  public setProductsPage(page: number): void {
    this.productsPage.set(this.clampPage(page));
  }

  public setStocksPage(page: number): void {
    this.stocksPage.set(this.clampPage(page));
  }

  public setExpiredPage(page: number): void {
    this.expiredPage.set(this.clampPage(page));
  }

  public setLanguage(language: AppLanguage): void {
    this.languageService.setLanguage(language);
  }

  public toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  public tr(key: keyof InventoryTranslation): string {
    return INVENTORY_TRANSLATIONS[this.languageService.language()][key];
  }

  public statusLabel(status: StockStatus): string {
    const statusMap: Record<StockStatus, keyof InventoryTranslation> = {
      critical: 'critical',
      inStock: 'inStock',
      lowStock: 'lowStock',
      outOfStock: 'outOfStock',
      reorderSoon: 'reorderSoon',
    };

    return this.tr(statusMap[status]);
  }

  public categoryStatusLabel(status: CategoryStatus): string {
    return this.tr(status);
  }

  private paginate(products: InventoryProduct[], page: number): InventoryProduct[] {
    const start = (this.clampPage(page) - 1) * this.pageSize;
    return products.slice(start, start + this.pageSize);
  }

  private clampPage(page: number): number {
    const totalPages = Math.max(1, Math.ceil(this.filteredProducts().length / this.pageSize));
    return Math.min(Math.max(1, page), totalPages);
  }
}
