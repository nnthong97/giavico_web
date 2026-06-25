/**
 * GV Mock Data – Nước Trái Cây (果汁)
 * Nguồn: phân tích GV排程表格, BCH001资料, 瓶裝包材採購進度, 原料進廠計劃
 */

import { GVMachineConfig, GVProductConfig } from '../models/gv.model';

// ─── MACHINE CONFIG (from 果汁（日，夜班）排程 sheet) ──────────────────────────
export const GV_MACHINES: GVMachineConfig[] = [
  {
    code: 'KM07',
    nameVN: 'KM07 – Dây chuyền Tắc/Dưa Hấu',
    nameZH: 'KM07 – 金桔/西瓜產線',
    capacityKgPerShift: 20_000,
    shiftsPerDay: 2,
    productFamilies: ['VKM', 'VWM'],
  },
  {
    code: 'KM08',
    nameVN: 'KM08 – Dây chuyền Tắc/Vải',
    nameZH: 'KM08 – 金桔/荔枝產線',
    capacityKgPerShift: 20_000,
    shiftsPerDay: 2,
    productFamilies: ['VKM', 'VLC'],
  },
  {
    code: 'RE05',
    nameVN: 'RE05 – Dây chuyền Atisô/Dừa/Thanh Long',
    nameZH: 'RE05 – 洛神/椰子/火龍果產線',
    capacityKgPerShift: 25_000,
    shiftsPerDay: 2,
    productFamilies: ['VRE', 'VCO', 'VDF'],
  },
  {
    code: 'GA01',
    nameVN: 'GA01 – Dây chuyền Ổi/Chanh Leo',
    nameZH: 'GA01 – 芭樂/百香果產線',
    capacityKgPerShift: 20_000,
    shiftsPerDay: 2,
    productFamilies: ['VGA', 'VPS'],
  },
];

// ─── PRODUCT CONFIG (từ BCH001资料 – 1,163 dòng → lấy 9 SP tiêu biểu) ───────
export const GV_PRODUCTS: GVProductConfig[] = [
  {
    productCode: 'VKM-AP104-FAL-08',
    productCodeTW: 'VMX-AP104-FAL-08',
    nameVN: 'Nước Tắc (Kumquat) 8oz',
    nameZH: '金桔飲料 8oz',
    rawMaterialCode: 'KM',
    rawMaterialNameVN: 'Tắc trái (Kumquat)',
    machineRequired: 'KM07',
    yieldRate: 0.87,
    qaDays: 7,
    sugarType: 'BCH001',
    sugarRateKgPerKg: 0.28,
    packageWeightG: 240,
    bottleOrigin: 'domestic',
  },
  {
    productCode: 'VKM-AP010-FAL-50',
    productCodeTW: 'VMX-AP010-FAL-50',
    nameVN: 'Nước Tắc (Kumquat) 50ml',
    nameZH: '金桔飲料 50ml',
    rawMaterialCode: 'KM',
    rawMaterialNameVN: 'Tắc trái (Kumquat)',
    machineRequired: 'KM08',
    yieldRate: 0.87,
    qaDays: 7,
    sugarType: 'BCH001',
    sugarRateKgPerKg: 0.28,
    packageWeightG: 50,
    bottleOrigin: 'domestic',
  },
  {
    productCode: 'VGA-AP024-BAD-52',
    productCodeTW: 'VMX-AP024-BAD-52',
    nameVN: 'Nước Ổi (Guava) 52oz',
    nameZH: '芭樂汁 52oz',
    rawMaterialCode: 'GV',
    rawMaterialNameVN: 'Ổi trái (Guava)',
    machineRequired: 'GA01',
    yieldRate: 0.88,
    qaDays: 7,
    sugarType: 'BCH001',
    sugarRateKgPerKg: 0.25,
    packageWeightG: 1560,
    bottleOrigin: 'domestic',
  },
  {
    productCode: 'VWM-AP001-FAD-80',
    productCodeTW: 'VMX-AP001-FAD-80',
    nameVN: 'Nước Dưa Hấu (Watermelon) 80ml',
    nameZH: '西瓜汁 80ml',
    rawMaterialCode: 'WM',
    rawMaterialNameVN: 'Dưa hấu trái',
    machineRequired: 'KM07',
    yieldRate: 0.85,
    qaDays: 7,
    sugarType: 'BCH047',   // 120h holding
    sugarRateKgPerKg: 0.30,
    packageWeightG: 80,
    bottleOrigin: 'import',  // HP022 Taiwan preform
  },
  {
    productCode: 'VRE-AP001-FAD-85',
    productCodeTW: 'VMX-AP001-FAD-85',
    nameVN: 'Nước Atisô Đỏ (Roselle) 85ml',
    nameZH: '洛神花汁 85ml',
    rawMaterialCode: 'RE',
    rawMaterialNameVN: 'Bông Atisô Đỏ (Roselle)',
    machineRequired: 'RE05',
    yieldRate: 0.83,
    qaDays: 7,
    sugarType: 'BCH047',   // 120h holding
    sugarRateKgPerKg: 0.32,
    packageWeightG: 85,
    bottleOrigin: 'import',
  },
  {
    productCode: 'VCO-8P982-FAC-50',
    productCodeTW: 'VMX-8P982-FAC-50',
    nameVN: 'Nước Dừa (Coconut) 50ml',
    nameZH: '椰子水 50ml',
    rawMaterialCode: 'CO',
    rawMaterialNameVN: 'Nước dừa non (Young Coconut)',
    machineRequired: 'RE05',
    yieldRate: 0.90,
    qaDays: 5,
    sugarType: 'BCH011',
    sugarRateKgPerKg: 0.20,
    packageWeightG: 50,
    bottleOrigin: 'domestic',
  },
  {
    productCode: 'VPS-AC001-FAD-50',
    productCodeTW: 'VMX-AC001-FAD-50',
    nameVN: 'Nước Chanh Leo (Passion Fruit) 50ml',
    nameZH: '百香果汁 50ml',
    rawMaterialCode: 'PS',
    rawMaterialNameVN: 'Chanh dây (Passion Fruit) pulp',
    machineRequired: 'GA01',
    yieldRate: 0.86,
    qaDays: 7,
    sugarType: 'BCH048',   // 10 days testing
    sugarRateKgPerKg: 0.35,
    packageWeightG: 50,
    bottleOrigin: 'domestic',
  },
  {
    productCode: 'VLC-AP097-FAD-85',
    productCodeTW: 'VMX-AP097-FAD-85',
    nameVN: 'Nước Vải (Lychee) 85ml',
    nameZH: '荔枝汁 85ml',
    rawMaterialCode: 'LC',
    rawMaterialNameVN: 'Vải trái (Lychee)',
    machineRequired: 'KM08',
    yieldRate: 0.88,
    qaDays: 7,
    sugarType: 'BCH001',
    sugarRateKgPerKg: 0.26,
    packageWeightG: 85,
    bottleOrigin: 'domestic',
  },
  {
    productCode: 'VDF-BH003-FAD-85',
    productCodeTW: 'VMX-BH003-FAD-85',
    nameVN: 'Nước Thanh Long (Dragon Fruit) 85ml',
    nameZH: '火龍果汁 85ml',
    rawMaterialCode: 'DF',
    rawMaterialNameVN: 'Thanh long (Dragon Fruit) pulp',
    machineRequired: 'RE05',
    yieldRate: 0.90,
    qaDays: 7,
    sugarType: 'BTS009',   // 7 days testing
    sugarRateKgPerKg: 0.28,
    packageWeightG: 85,
    bottleOrigin: 'domestic',
  },
];

// ─── MACHINE CONFLICT PAIRS (từ sheet "Đụng máy") ──────────────────────────
// Cặp sản phẩm không thể chạy liên tiếp trên cùng máy
export const GV_MACHINE_CONFLICTS: Array<{a: string; b: string; machine: string; note: string}> = [
  { a: 'VKM-BC063-FAL-50', b: 'VAA-AC101-FAC-08', machine: 'KM07', note: 'Đụng máy NF 8mt – vệ sinh mất 4h' },
  { a: 'VWM-AP001-FAD-80', b: 'VRE-AP001-FAD-85', machine: 'KM07', note: 'Khác màu – cần CIP rửa hoàn toàn' },
];

// ─── GV ORDERS (đơn hàng cần lên lịch – 8 đơn thực tế) ─────────────────────
const d = (offset: number): string => {
  const dt = new Date();
  dt.setDate(dt.getDate() + offset);
  return dt.toISOString().split('T')[0];
};

export interface GVOrderDemo {
  orderId: string;
  vnCode: string;
  twCode: string;
  productCode: string;
  qty: number;    // kg
  etd: string;
  customer: string;
  region: string;
  status: 'CH' | 'DL' | 'XN' | 'DX' | 'CX' | 'HU';
  note?: string;
}

export const GV_PENDING_ORDERS: GVOrderDemo[] = [
  {
    orderId: 'GV-ORD-001',
    vnCode: 'VN-26020018-001',
    twCode: 'VMX-AP244-RAL-T1',
    productCode: 'VKM-AP104-FAL-08',
    qty: 104_000,      // 104 MT
    etd: d(14),
    customer: 'TW001 Đài Loan',
    region: 'TW001',
    status: 'DL',
    note: 'Classy 355ml – 8 cont × 40RF. Chai HP010 đã có đủ.',
  },
  {
    orderId: 'GV-ORD-002',
    vnCode: 'VN-26020030-001',
    twCode: 'TW002-GV-030',
    productCode: 'VGA-AP024-BAD-52',
    qty: 83_000,       // 83 MT
    etd: d(21),
    customer: 'TW002 Đài Loan',
    region: 'TW002',
    status: 'CH',
  },
  {
    orderId: 'GV-ORD-003',
    vnCode: 'VN-26030010-001',
    twCode: 'SEA-GV-010',
    productCode: 'VWM-AP001-FAD-80',
    qty: 60_000,       // 60 MT (BCH047 – cần chuẩn bị đường trước 5 ngày)
    etd: d(28),
    customer: 'Đông Nam Á – Singapore Dist.',
    region: 'ĐNA',
    status: 'CH',
    note: 'Chai HP022 nhập TW – cần đặt sớm (LT 38 ngày)',
  },
  {
    orderId: 'GV-ORD-004',
    vnCode: 'VN-26030015-001',
    twCode: 'EU-GV-015',
    productCode: 'VRE-AP001-FAD-85',
    qty: 45_000,       // 45 MT (BCH047)
    etd: d(35),
    customer: 'Euro Foods Co.',
    region: 'ÂuMỹ',
    status: 'XN',
    note: 'Atisô đỏ mùa vụ – RE mùa khô từ tháng 2-5. Ưu tiên cao.',
  },
  {
    orderId: 'GV-ORD-005',
    vnCode: 'VN-26030020-001',
    twCode: 'TW001-GV-020',
    productCode: 'VCO-8P982-FAC-50',
    qty: 90_000,       // 90 MT
    etd: d(21),
    customer: 'TW001 Đài Loan',
    region: 'TW001',
    status: 'DL',
  },
  {
    orderId: 'GV-ORD-006',
    vnCode: 'VN-26040005-001',
    twCode: 'TW002-GV-040',
    productCode: 'VKM-AP010-FAL-50',
    qty: 200_000,      // 200 MT – đơn lớn nhất tháng
    etd: d(45),
    customer: 'TW002 Đài Loan',
    region: 'TW002',
    status: 'CH',
    note: 'Đơn volume lớn – lên kế hoạch sớm',
  },
  {
    orderId: 'GV-ORD-007',
    vnCode: 'VN-26030025-001',
    twCode: 'SEA-GV-025',
    productCode: 'VPS-AC001-FAD-50',
    qty: 30_000,       // 30 MT (BCH048 – cần 10 ngày testing đường)
    etd: d(30),
    customer: 'Campuchia Dist.',
    region: 'ĐNA',
    status: 'CH',
    note: 'BCH048 cần chuẩn bị trước 10 ngày ngày SX',
  },
  {
    orderId: 'GV-ORD-008',
    vnCode: 'VN-26040010-001',
    twCode: 'US-GV-010',
    productCode: 'VDF-BH003-FAD-85',
    qty: 50_000,       // 50 MT (BTS009 – 7 ngày testing)
    etd: d(40),
    customer: 'US Foods Import',
    region: 'ÂuMỹ',
    status: 'CH',
    note: 'BTS009 cần 7 ngày kiểm tra trước khi dùng SX',
  },
];

// ─── GV EXISTING SCHEDULE SLOTS (tuần hiện tại – pre-built) ─────────────────
// Slot đã có sẵn trước khi chạy auto-scheduler (các đơn đang DL)
export const GV_EXISTING_SLOTS = [
  // GV-ORD-001 đang sản xuất (VKM-AP104-FAL-08 / KM07)
  { machine: 'KM07', shift: 'day'   as const, date: d(-2), orderId: 'GV-ORD-001', productCode: 'VKM-AP104-FAL-08', productName: 'Nước Tắc 8oz', productNameZH: '金桔飲料 8oz', plannedQty: 20_000, actualQty: 19_800, status: 'done'        as const },
  { machine: 'KM07', shift: 'night' as const, date: d(-2), orderId: 'GV-ORD-001', productCode: 'VKM-AP104-FAL-08', productName: 'Nước Tắc 8oz', productNameZH: '金桔飲料 8oz', plannedQty: 20_000, actualQty: 20_000, status: 'done'        as const },
  { machine: 'KM07', shift: 'day'   as const, date: d(-1), orderId: 'GV-ORD-001', productCode: 'VKM-AP104-FAL-08', productName: 'Nước Tắc 8oz', productNameZH: '金桔飲料 8oz', plannedQty: 20_000, actualQty: 19_500, status: 'done'        as const },
  { machine: 'KM07', shift: 'day'   as const, date: d(0),  orderId: 'GV-ORD-001', productCode: 'VKM-AP104-FAL-08', productName: 'Nước Tắc 8oz', productNameZH: '金桔飲料 8oz', plannedQty: 20_000, actualQty: 8_500,  status: 'in-progress' as const },
  { machine: 'KM07', shift: 'night' as const, date: d(0),  orderId: 'GV-ORD-001', productCode: 'VKM-AP104-FAL-08', productName: 'Nước Tắc 8oz', productNameZH: '金桔飲料 8oz', plannedQty: 20_000, actualQty: null,  status: 'planned'     as const },
  // GV-ORD-005 dừa đang SX song song (RE05)
  { machine: 'RE05', shift: 'day'   as const, date: d(-1), orderId: 'GV-ORD-005', productCode: 'VCO-8P982-FAC-50', productName: 'Nước Dừa 50ml', productNameZH: '椰子水 50ml', plannedQty: 25_000, actualQty: 24_800, status: 'done'        as const },
  { machine: 'RE05', shift: 'night' as const, date: d(-1), orderId: 'GV-ORD-005', productCode: 'VCO-8P982-FAC-50', productName: 'Nước Dừa 50ml', productNameZH: '椰子水 50ml', plannedQty: 25_000, actualQty: 25_000, status: 'done'        as const },
  { machine: 'RE05', shift: 'day'   as const, date: d(0),  orderId: 'GV-ORD-005', productCode: 'VCO-8P982-FAC-50', productName: 'Nước Dừa 50ml', productNameZH: '椰子水 50ml', plannedQty: 25_000, actualQty: 12_000, status: 'in-progress' as const },
];
