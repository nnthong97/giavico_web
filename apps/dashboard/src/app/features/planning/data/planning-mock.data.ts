import { Material, Order, Product, ProductionSlot } from '../models/planning.model';

const d = (offset: number): string => {
  const dt = new Date();
  dt.setDate(dt.getDate() + offset);
  return dt.toISOString().split('T')[0];
};

// Products – bổ sung đầy đủ GV products với machine code thực tế
export const PLANNING_PRODUCTS: Product[] = [
  // ── AV (Nha Đam / Aloe Vera) ──────────────────────────────────────────────
  { code: 'VAV-AI266-HAA-07', codeTW: 'VMX-AI266-HAA-07', nameVN: 'Nha Đam Lô Hội 07', nameZH: '蘆薈飲料07', line: 'AV', yieldRate: 0.92, wastageKg: 650, productionDaysPerTon: 0.5, qaDays: 3, machineRequired: 'KM07' },
  { code: 'VAV-AI270-HAA-25', codeTW: 'VMX-AI270-HAA-25', nameVN: 'Nha Đam Lô Hội 25', nameZH: '蘆薈飲料25', line: 'AV', yieldRate: 0.91, wastageKg: 700, productionDaysPerTon: 0.5, qaDays: 3, machineRequired: 'KM07' },
  { code: 'VAV-BH004-LAA-98', codeTW: 'VMX-BH004-LAA-98', nameVN: 'Nha Đam Không Đường 98', nameZH: '無糖蘆薈98', line: 'AV', yieldRate: 0.93, wastageKg: 600, productionDaysPerTon: 0.5, qaDays: 3, machineRequired: 'KM07' },
  { code: 'VPS-AC156-FAD-50', codeTW: 'VMX-AC156-FAD-50', nameVN: 'Gel Lô Hội 50ml', nameZH: '蘆薈凝膠50ml', line: 'AV', yieldRate: 0.90, wastageKg: 600, productionDaysPerTon: 0.8, qaDays: 5, machineRequired: 'RE05' },

  // ── GV (Nước Trái Cây / Juice) ─────────────────────────────────────────────
  // Máy KM07: Tắc (Kumquat), Dưa Hấu (Watermelon)
  { code: 'VKM-AP104-FAL-08', codeTW: 'VMX-AP104-FAL-08', nameVN: 'Nước Tắc 8oz', nameZH: '金桔飲料8oz', line: 'GV', yieldRate: 0.87, wastageKg: 850, productionDaysPerTon: 0.05, qaDays: 7, machineRequired: 'KM07' },
  { code: 'VWM-AP001-FAD-80', codeTW: 'VMX-AP001-FAD-80', nameVN: 'Nước Dưa Hấu 80ml', nameZH: '西瓜汁80ml', line: 'GV', yieldRate: 0.85, wastageKg: 900, productionDaysPerTon: 0.05, qaDays: 7, machineRequired: 'KM07' },
  // Máy KM08: Tắc 50ml, Vải (Lychee)
  { code: 'VKM-AP010-FAL-50', codeTW: 'VMX-AP010-FAL-50', nameVN: 'Nước Tắc 50ml', nameZH: '金桔飲料50ml', line: 'GV', yieldRate: 0.87, wastageKg: 800, productionDaysPerTon: 0.05, qaDays: 7, machineRequired: 'KM08' },
  { code: 'VLC-AP097-FAD-85', codeTW: 'VMX-AP097-FAD-85', nameVN: 'Nước Vải 85ml', nameZH: '荔枝汁85ml', line: 'GV', yieldRate: 0.88, wastageKg: 800, productionDaysPerTon: 0.05, qaDays: 7, machineRequired: 'KM08' },
  // Máy RE05: Atisô Đỏ (Roselle), Dừa (Coconut), Thanh Long (DragonFruit)
  { code: 'VRE-AP001-FAD-85', codeTW: 'VMX-AP001-FAD-85', nameVN: 'Nước Atisô Đỏ 85ml', nameZH: '洛神花汁85ml', line: 'GV', yieldRate: 0.83, wastageKg: 900, productionDaysPerTon: 0.05, qaDays: 7, machineRequired: 'RE05' },
  { code: 'VCO-8P982-FAC-50', codeTW: 'VMX-8P982-FAC-50', nameVN: 'Nước Dừa 50ml', nameZH: '椰子水50ml', line: 'GV', yieldRate: 0.90, wastageKg: 700, productionDaysPerTon: 0.04, qaDays: 5, machineRequired: 'RE05' },
  { code: 'VDF-BH003-FAD-85', codeTW: 'VMX-BH003-FAD-85', nameVN: 'Nước Thanh Long 85ml', nameZH: '火龍果汁85ml', line: 'GV', yieldRate: 0.90, wastageKg: 800, productionDaysPerTon: 0.04, qaDays: 7, machineRequired: 'RE05' },
  // Máy GA01: Ổi (Guava), Chanh Leo (Passion Fruit)
  { code: 'VGA-AP024-BAD-52', codeTW: 'VMX-AP024-BAD-52', nameVN: 'Nước Ổi 52oz', nameZH: '芭樂汁52oz', line: 'GV', yieldRate: 0.88, wastageKg: 850, productionDaysPerTon: 0.05, qaDays: 7, machineRequired: 'GA01' },
  { code: 'VPS-AC001-FAD-50', codeTW: 'VMX-AC001-FAD-50', nameVN: 'Nước Chanh Leo 50ml', nameZH: '百香果汁50ml', line: 'GV', yieldRate: 0.86, wastageKg: 800, productionDaysPerTon: 0.05, qaDays: 7, machineRequired: 'GA01' },

  // ── ND (Thạch Dừa / Nata de Coco) ─────────────────────────────────────────
  { code: 'VND-NC001-HAA-20', codeTW: 'VMX-NC001-HAA-20', nameVN: 'Thạch Dừa Hạt Lựu 20kg', nameZH: '椰果粒20kg', line: 'ND', yieldRate: 0.85, wastageKg: 1000, productionDaysPerTon: 1.0, qaDays: 2, machineRequired: 'RE05' },
  { code: 'VND-NC002-HAA-50', codeTW: 'VMX-NC002-HAA-50', nameVN: 'Thạch Dừa Tấm Mỏng 50kg', nameZH: '薄片椰果50kg', line: 'ND', yieldRate: 0.83, wastageKg: 900, productionDaysPerTon: 1.2, qaDays: 2, machineRequired: 'RE05' },
];

// Orders – thêm GV orders đầy đủ
export const PLANNING_ORDERS: Order[] = [
  // AV Orders
  { id: 'av-1', vnCode: 'VN-26010045-001', twCode: 'TW001-26-001', productCode: 'VAV-AI266-HAA-07', productCodeTW: 'VMX-AI266-HAA-07', productName: 'Nha Đam Lô Hội 07', productNameZH: '蘆薈飲料07', productLine: 'AV', customer: 'TW001 Đài Loan', region: 'TW001', orderDate: '2026-01-15', qty: 12000, qtyProduced: 12000, qtyShipped: 8000, deliveryDate: d(15), status: 'CX' },
  { id: 'av-2', vnCode: 'VN-26020020-001', twCode: 'EU-26-020', productCode: 'VPS-AC156-FAD-50', productCodeTW: 'VMX-AC156-FAD-50', productName: 'Gel Lô Hội 50ml', productNameZH: '蘆薈凝膠50ml', productLine: 'AV', customer: 'Euro Foods Co.', region: 'ÂuMỹ', orderDate: '2026-02-12', qty: 6000, qtyProduced: 0, qtyShipped: 0, deliveryDate: d(37), status: 'XN' },
  { id: 'av-3', vnCode: 'VN-26030001-001', twCode: 'SH-26-001', productCode: 'VAV-AI270-HAA-25', productCodeTW: 'VMX-AI270-HAA-25', productName: 'Nha Đam Lô Hội 25', productNameZH: '蘆薈飲料25', productLine: 'AV', customer: 'Thượng Hải Import Co.', region: 'TQ', orderDate: '2026-03-01', qty: 10000, qtyProduced: 3000, qtyShipped: 0, deliveryDate: d(50), status: 'DL' },
  { id: 'av-4', vnCode: 'VN-26030008-001', twCode: 'TW001-26-008', productCode: 'VAV-BH004-LAA-98', productCodeTW: 'VMX-BH004-LAA-98', productName: 'Nha Đam Không Đường 98', productNameZH: '無糖蘆薈98', productLine: 'AV', customer: 'TW001 Đài Loan', region: 'TW001', orderDate: '2026-03-08', qty: 9000, qtyProduced: 1500, qtyShipped: 0, deliveryDate: d(65), status: 'DL' },

  // GV Orders – thực tế từ gv-mock.data
  { id: 'gv-1', vnCode: 'VN-26020018-001', twCode: 'VMX-AP244-RAL-T1', productCode: 'VKM-AP104-FAL-08', productCodeTW: 'VMX-AP104-FAL-08', productName: 'Nước Tắc 8oz', productNameZH: '金桔飲料8oz', productLine: 'GV', customer: 'TW001 Đài Loan', region: 'TW001', orderDate: '2026-02-10', qty: 104000, qtyProduced: 60000, qtyShipped: 0, deliveryDate: d(14), status: 'DL', note: 'Classy 355ml – 8 cont × 40RF' },
  { id: 'gv-2', vnCode: 'VN-26020030-001', twCode: 'TW002-GV-030', productCode: 'VGA-AP024-BAD-52', productCodeTW: 'VMX-AP024-BAD-52', productName: 'Nước Ổi 52oz', productNameZH: '芭樂汁52oz', productLine: 'GV', customer: 'TW002 Đài Loan', region: 'TW002', orderDate: '2026-02-15', qty: 83000, qtyProduced: 0, qtyShipped: 0, deliveryDate: d(21), status: 'CH' },
  { id: 'gv-3', vnCode: 'VN-26030010-001', twCode: 'SEA-GV-010', productCode: 'VWM-AP001-FAD-80', productCodeTW: 'VMX-AP001-FAD-80', productName: 'Nước Dưa Hấu 80ml', productNameZH: '西瓜汁80ml', productLine: 'GV', customer: 'Singapore Distributor', region: 'ĐNA', orderDate: '2026-03-01', qty: 60000, qtyProduced: 0, qtyShipped: 0, deliveryDate: d(28), status: 'CH', note: 'Chai HP022 nhập TW – LT 38 ngày' },
  { id: 'gv-4', vnCode: 'VN-26030015-001', twCode: 'EU-GV-015', productCode: 'VRE-AP001-FAD-85', productCodeTW: 'VMX-AP001-FAD-85', productName: 'Nước Atisô Đỏ 85ml', productNameZH: '洛神花汁85ml', productLine: 'GV', customer: 'Euro Foods Co.', region: 'ÂuMỹ', orderDate: '2026-03-05', qty: 45000, qtyProduced: 0, qtyShipped: 0, deliveryDate: d(35), status: 'XN', note: 'RE mùa vụ – ưu tiên' },
  { id: 'gv-5', vnCode: 'VN-26030020-001', twCode: 'TW001-GV-020', productCode: 'VCO-8P982-FAC-50', productCodeTW: 'VMX-8P982-FAC-50', productName: 'Nước Dừa 50ml', productNameZH: '椰子水50ml', productLine: 'GV', customer: 'TW001 Đài Loan', region: 'TW001', orderDate: '2026-03-05', qty: 90000, qtyProduced: 37000, qtyShipped: 0, deliveryDate: d(21), status: 'DL' },
  { id: 'gv-6', vnCode: 'VN-26040005-001', twCode: 'TW002-GV-040', productCode: 'VKM-AP010-FAL-50', productCodeTW: 'VMX-AP010-FAL-50', productName: 'Nước Tắc 50ml', productNameZH: '金桔飲料50ml', productLine: 'GV', customer: 'TW002 Đài Loan', region: 'TW002', orderDate: '2026-03-10', qty: 200000, qtyProduced: 0, qtyShipped: 0, deliveryDate: d(45), status: 'CH', note: 'Đơn volume lớn – lên kế hoạch sớm' },
  { id: 'gv-7', vnCode: 'VN-26030025-001', twCode: 'SEA-GV-025', productCode: 'VPS-AC001-FAD-50', productCodeTW: 'VMX-AC001-FAD-50', productName: 'Nước Chanh Leo 50ml', productNameZH: '百香果汁50ml', productLine: 'GV', customer: 'Campuchia Dist.', region: 'ĐNA', orderDate: '2026-03-10', qty: 30000, qtyProduced: 0, qtyShipped: 0, deliveryDate: d(30), status: 'CH', note: 'BCH048 cần chuẩn bị đường trước 10 ngày' },
  { id: 'gv-8', vnCode: 'VN-26040010-001', twCode: 'US-GV-010', productCode: 'VDF-BH003-FAD-85', productCodeTW: 'VMX-BH003-FAD-85', productName: 'Nước Thanh Long 85ml', productNameZH: '火龍果汁85ml', productLine: 'GV', customer: 'US Foods Import', region: 'ÂuMỹ', orderDate: '2026-03-12', qty: 50000, qtyProduced: 0, qtyShipped: 0, deliveryDate: d(40), status: 'CH', note: 'BTS009 – 7 ngày kiểm tra đường' },

  // ND Orders
  { id: 'nd-1', vnCode: 'VN-26020012-001', twCode: '', productCode: 'VND-NC001-HAA-20', productCodeTW: 'VMX-NC001-HAA-20', productName: 'Thạch Dừa Hạt Lựu 20kg', productNameZH: '椰果粒20kg', productLine: 'ND', customer: 'Khách VN Nội Tiêu', region: 'VN', orderDate: '2026-02-01', qty: 5000, qtyProduced: 5000, qtyShipped: 5000, deliveryDate: d(-20), status: 'DX' },
  { id: 'nd-2', vnCode: 'VN-26020025-001', twCode: 'TW002-26-025', productCode: 'VND-NC001-HAA-20', productCodeTW: 'VMX-NC001-HAA-20', productName: 'Thạch Dừa Hạt Lựu 20kg', productNameZH: '椰果粒20kg', productLine: 'ND', customer: 'TW002 Đài Loan', region: 'TW002', orderDate: '2026-02-25', qty: 7000, qtyProduced: 0, qtyShipped: 0, deliveryDate: d(51), status: 'CH', note: 'Đang chờ xác nhận nguyên liệu' },
  { id: 'nd-3', vnCode: 'VN-26030005-001', twCode: 'KR-26-005', productCode: 'VND-NC002-HAA-50', productCodeTW: 'VMX-NC002-HAA-50', productName: 'Thạch Dừa Tấm Mỏng 50kg', productNameZH: '薄片椰果50kg', productLine: 'ND', customer: 'Korean Foods Ltd.', region: 'Hàn/Nhật', orderDate: '2026-03-05', qty: 4000, qtyProduced: 0, qtyShipped: 0, deliveryDate: d(75), status: 'CH' },
];

// Slots – GV dùng KM07/KM08/RE05/GA01 (đúng với phân tích file thực tế)
export const PLANNING_SLOTS: ProductionSlot[] = [
  // GV – KM07: đang SX VKM-AP104-FAL-08 (GV-ORD-001 / 104 MT)
  { id: 'gv-s1',  date: d(-2), machine: 'KM07', shift: 'day',   orderId: 'gv-1', productCode: 'VKM-AP104-FAL-08', productName: 'Nước Tắc 8oz',     productLine: 'GV', plannedQty: 20000, actualQty: 19800, lotNo: 'GV-001-01', status: 'done' },
  { id: 'gv-s2',  date: d(-2), machine: 'KM07', shift: 'night',  orderId: 'gv-1', productCode: 'VKM-AP104-FAL-08', productName: 'Nước Tắc 8oz',     productLine: 'GV', plannedQty: 20000, actualQty: 20000, lotNo: 'GV-001-02', status: 'done' },
  { id: 'gv-s3',  date: d(-1), machine: 'KM07', shift: 'day',   orderId: 'gv-1', productCode: 'VKM-AP104-FAL-08', productName: 'Nước Tắc 8oz',     productLine: 'GV', plannedQty: 20000, actualQty: 19500, lotNo: 'GV-001-03', status: 'done' },
  { id: 'gv-s4',  date: d(0),  machine: 'KM07', shift: 'day',   orderId: 'gv-1', productCode: 'VKM-AP104-FAL-08', productName: 'Nước Tắc 8oz',     productLine: 'GV', plannedQty: 20000, actualQty: 8500,  lotNo: 'GV-001-04', status: 'in-progress' },
  { id: 'gv-s5',  date: d(0),  machine: 'KM07', shift: 'night',  orderId: 'gv-1', productCode: 'VKM-AP104-FAL-08', productName: 'Nước Tắc 8oz',     productLine: 'GV', plannedQty: 20000, actualQty: null,  lotNo: 'GV-001-05', status: 'planned' },
  // GV – RE05: đang SX VCO (GV-ORD-005 / 90 MT)
  { id: 'gv-s6',  date: d(-1), machine: 'RE05', shift: 'day',   orderId: 'gv-5', productCode: 'VCO-8P982-FAC-50', productName: 'Nước Dừa 50ml',    productLine: 'GV', plannedQty: 25000, actualQty: 24800, lotNo: 'GV-005-01', status: 'done' },
  { id: 'gv-s7',  date: d(-1), machine: 'RE05', shift: 'night',  orderId: 'gv-5', productCode: 'VCO-8P982-FAC-50', productName: 'Nước Dừa 50ml',    productLine: 'GV', plannedQty: 25000, actualQty: 25000, lotNo: 'GV-005-02', status: 'done' },
  { id: 'gv-s8',  date: d(0),  machine: 'RE05', shift: 'day',   orderId: 'gv-5', productCode: 'VCO-8P982-FAC-50', productName: 'Nước Dừa 50ml',    productLine: 'GV', plannedQty: 25000, actualQty: 12000, lotNo: 'GV-005-03', status: 'in-progress' },
  // AV – KM07: slot AV sau khi GV xong
  { id: 'av-s1', date: d(1),  machine: 'KM07', shift: 'day',   orderId: 'av-1', productCode: 'VAV-AI266-HAA-07', productName: 'Nha Đam Lô Hội 07', productLine: 'AV', plannedQty: 15000, actualQty: null,  lotNo: 'AV-001-01', status: 'planned' },
  { id: 'av-s2', date: d(2),  machine: 'KM07', shift: 'day',   orderId: 'av-3', productCode: 'VAV-AI270-HAA-25', productName: 'Nha Đam Lô Hội 25', productLine: 'AV', plannedQty: 15000, actualQty: null,  lotNo: 'AV-003-01', status: 'planned' },
  { id: 'av-s3', date: d(2),  machine: 'RE05', shift: 'night',  orderId: 'av-4', productCode: 'VAV-BH004-LAA-98', productName: 'Nha Đam KĐường 98', productLine: 'AV', plannedQty: 15000, actualQty: null,  lotNo: 'AV-004-01', status: 'planned' },
  // ND – RE05 (sau GV dừa)
  { id: 'nd-s1', date: d(3),  machine: 'RE05', shift: 'day',   orderId: 'nd-2', productCode: 'VND-NC001-HAA-20', productName: 'Thạch Dừa Hạt Lựu', productLine: 'ND', plannedQty: 8000,  actualQty: null,  lotNo: 'ND-002-01', status: 'planned' },
  { id: 'nd-s2', date: d(4),  machine: 'RE05', shift: 'day',   orderId: 'nd-2', productCode: 'VND-NC001-HAA-20', productName: 'Thạch Dừa Hạt Lựu', productLine: 'ND', plannedQty: 8000,  actualQty: null,  lotNo: 'ND-002-02', status: 'planned' },
];

// Machines – update để phản ánh đúng GV machine list
export const PLANNING_MACHINES = ['KM07', 'KM08', 'GA01', 'RE05'];

export const PLANNING_MACHINE_LABELS: Record<string, { vi: string; zh: string; en: string }> = {
  KM07: { vi: 'KM07 – Tắc / Dưa Hấu',      zh: 'KM07 – 金桔/西瓜',       en: 'KM07 – Kumquat/Watermelon' },
  KM08: { vi: 'KM08 – Tắc 50ml / Vải',      zh: 'KM08 – 金桔50ml/荔枝',  en: 'KM08 – Kumquat50/Lychee' },
  GA01: { vi: 'GA01 – Ổi / Chanh Leo',       zh: 'GA01 – 芭樂/百香果',     en: 'GA01 – Guava/Passion' },
  RE05: { vi: 'RE05 – Atisô / Dừa / ND',     zh: 'RE05 – 洛神/椰子/椰果', en: 'RE05 – Roselle/Coconut/ND' },
};

// Inventory – giữ nguyên, đã đủ
export const PLANNING_INVENTORY: Material[] = [
  { id: 'm1',  codeVN: 'VNL-ALOEVERA-001',      codeTW: 'TWM-ALOEVERA-001',     nameVN: 'Nha đam thô (Lô Hội tươi)',       nameZH: '新鮮蘆薈原料',   type: 'raw',       unit: 'kg',  stockWarehouse: 8500,   stockSX1: 1200,  stockSX2: 0,     stockSX4: 0,    expiryDate: d(20),   leadTimeDays: 7,  origin: 'domestic', seasonal: true,  supplier: 'Công ty Nha Đam Bình Thuận' },
  { id: 'm2',  codeVN: 'VNL-SUGAR-BCH001',       codeTW: 'TWM-SUGAR-BCH001',     nameVN: 'Đường BCH001 (tinh luyện RS)',     nameZH: '精製白糖BCH001', type: 'raw',       unit: 'kg',  stockWarehouse: 25000,  stockSX1: 3000,  stockSX2: 2000,  stockSX4: 500,  expiryDate: d(180),  leadTimeDays: 2,  origin: 'domestic', seasonal: false, supplier: 'Đường Biên Hòa' },
  { id: 'm3',  codeVN: 'VNL-SUGAR-BCH047',       codeTW: 'TWM-SUGAR-BCH047',     nameVN: 'Đường BCH047 (120h holding)',      nameZH: '特製糖BCH047',   type: 'semi',      unit: 'kg',  stockWarehouse: 15000,  stockSX1: 0,     stockSX2: 0,     stockSX4: 0,    expiryDate: d(30),   leadTimeDays: 5,  origin: 'domestic', seasonal: false, supplier: 'Nội bộ (KT gia nhiệt)' },
  { id: 'm4',  codeVN: 'VNL-KUMQUAT-001',        codeTW: 'TWM-KUMQUAT-001',      nameVN: 'Tắc trái (Kumquat) tươi',         nameZH: '新鮮金桔',       type: 'raw',       unit: 'kg',  stockWarehouse: 18000,  stockSX1: 2000,  stockSX2: 0,     stockSX4: 0,    expiryDate: d(5),    leadTimeDays: 1,  origin: 'domestic', seasonal: true,  supplier: 'Huỳnh Thùy Trang, Cửu Long' },
  { id: 'm5',  codeVN: 'VNL-WATERMELON-001',     codeTW: 'TWM-WATERMELON-001',   nameVN: 'Dưa hấu trái (Watermelon)',       nameZH: '新鮮西瓜',       type: 'raw',       unit: 'kg',  stockWarehouse: 12000,  stockSX1: 0,     stockSX2: 0,     stockSX4: 0,    expiryDate: d(4),    leadTimeDays: 1,  origin: 'domestic', seasonal: true,  supplier: 'Nguyễn Thị Lót, Thanh Trà Co.' },
  { id: 'm6',  codeVN: 'VNL-GUAVA-001',          codeTW: 'TWM-GUAVA-001',        nameVN: 'Ổi trái (Guava)',                 nameZH: '新鮮芭樂',       type: 'raw',       unit: 'kg',  stockWarehouse: 6000,   stockSX1: 0,     stockSX2: 0,     stockSX4: 0,    expiryDate: d(3),    leadTimeDays: 1,  origin: 'domestic', seasonal: true,  supplier: 'Thanh Trà Co.' },
  { id: 'm7',  codeVN: 'VNL-ROSELLE-001',        codeTW: 'TWM-ROSELLE-001',      nameVN: 'Bông Atisô Đỏ (Roselle) khô',    nameZH: '乾燥洛神花',     type: 'raw',       unit: 'kg',  stockWarehouse: 3200,   stockSX1: 800,   stockSX2: 0,     stockSX4: 0,    expiryDate: d(60),   leadTimeDays: 3,  origin: 'domestic', seasonal: true,  supplier: 'Giavico Farm, Lê Thị Thanh Trúc' },
  { id: 'm8',  codeVN: 'VNL-COCONUT-001',        codeTW: 'TWM-COCONUT-001',      nameVN: 'Nước dừa non (Young Coconut)',    nameZH: '嫩椰子水',       type: 'raw',       unit: 'kg',  stockWarehouse: 8000,   stockSX1: 0,     stockSX2: 1400,  stockSX4: 0,    expiryDate: d(2),    leadTimeDays: 1,  origin: 'domestic', seasonal: false, supplier: 'Lê Công Điền, Thanh Trà' },
  { id: 'm9',  codeVN: 'VNL-NATA-RAW-001',       codeTW: 'TWM-NATA-RAW-001',     nameVN: 'Thạch dừa thô (chưa xử lý)',     nameZH: '生椰果(未加工)', type: 'raw',       unit: 'kg',  stockWarehouse: 12000,  stockSX1: 0,     stockSX2: 4500,  stockSX4: 0,    expiryDate: d(10),   leadTimeDays: 14, origin: 'domestic', seasonal: false, supplier: 'HTX Thạch Dừa Bến Tre' },
  { id: 'm10', codeVN: 'VPL-BOTTLE-HP010',       codeTW: 'TWM-BOTTLE-HP010',     nameVN: 'Chai HP010 (Classy, domestic)',   nameZH: 'HP010瓶(國內)',  type: 'auxiliary', unit: 'cái', stockWarehouse: 165000, stockSX1: 20000, stockSX2: 0,     stockSX4: 0,    expiryDate: d(730),  leadTimeDays: 8,  origin: 'domestic', seasonal: false, supplier: 'Bao bì Tân Tiến' },
  { id: 'm11', codeVN: 'VPL-BOTTLE-HP022',       codeTW: 'TWM-BOTTLE-HP022',     nameVN: 'Chai HP022 (phôi TW, nhập)',      nameZH: 'HP022瓶胚(進口)',type: 'auxiliary', unit: 'cái', stockWarehouse: 42000,  stockSX1: 5000,  stockSX2: 0,     stockSX4: 0,    expiryDate: d(730),  leadTimeDays: 38, origin: 'import',   seasonal: false, supplier: 'Taiwan Bottle Mfg.' },
  { id: 'm12', codeVN: 'VPL-DECAL-GV001',        codeTW: 'TWM-DECAL-GV001',      nameVN: 'Decal nhãn GV (chung)',           nameZH: 'GV標籤',         type: 'auxiliary', unit: 'cái', stockWarehouse: 85000,  stockSX1: 12000, stockSX2: 0,     stockSX4: 0,    expiryDate: d(365),  leadTimeDays: 16, origin: 'domestic', seasonal: false, supplier: 'In ấn Lê Quang' },
];
