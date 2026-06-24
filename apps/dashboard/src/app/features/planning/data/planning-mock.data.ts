import { Material, Order, Product, ProductionSlot } from '../models/planning.model';

const d = (offset: number): string => {
  const dt = new Date();
  dt.setDate(dt.getDate() + offset);
  return dt.toISOString().split('T')[0];
};

export const PLANNING_PRODUCTS: Product[] = [
  { code: 'VAV-AI266-HAA-07', codeTW: 'VMX-AI266-HAA-07', nameVN: 'Nha Đam Lô Hội 07', nameZH: '蘆薈飲料07', line: 'AV', yieldRate: 0.92, wastageKg: 650, productionDaysPerTon: 0.5, qaDays: 3, machineRequired: 'KM07' },
  { code: 'VAV-AI270-HAA-25', codeTW: 'VMX-AI270-HAA-25', nameVN: 'Nha Đam Lô Hội 25', nameZH: '蘆薈飲料25', line: 'AV', yieldRate: 0.91, wastageKg: 700, productionDaysPerTon: 0.5, qaDays: 3, machineRequired: 'KM07' },
  { code: 'VPS-AC156-FAD-50', codeTW: 'VMX-AC156-FAD-50', nameVN: 'Gel Lô Hội 50ml', nameZH: '蘆薈凝膠50ml', line: 'AV', yieldRate: 0.90, wastageKg: 600, productionDaysPerTon: 0.8, qaDays: 5, machineRequired: 'RE05' },
  { code: 'VLC-AP097-FAD-85', codeTW: 'VMX-AP097-FAD-85', nameVN: 'Nước Trái Cây Tổng Hợp 85', nameZH: '綜合果汁85', line: 'GV', yieldRate: 0.88, wastageKg: 800, productionDaysPerTon: 0.6, qaDays: 7, machineRequired: 'WM01' },
  { code: 'VKM-AP104-FAL-08', codeTW: 'VMX-AP104-FAL-08', nameVN: 'Nước Trái Cây Nhiệt Đới 08', nameZH: '熱帶果汁08', line: 'GV', yieldRate: 0.87, wastageKg: 850, productionDaysPerTon: 0.6, qaDays: 7, machineRequired: 'GA01' },
  { code: 'VND-NC001-HAA-20', codeTW: 'VMX-NC001-HAA-20', nameVN: 'Thạch Dừa Hạt Lựu 20kg', nameZH: '椰果粒20kg', line: 'ND', yieldRate: 0.85, wastageKg: 1000, productionDaysPerTon: 1.0, qaDays: 2, machineRequired: 'RE05' },
  { code: 'VND-NC002-HAA-50', codeTW: 'VMX-NC002-HAA-50', nameVN: 'Thạch Dừa Tấm Mỏng 50kg', nameZH: '薄片椰果50kg', line: 'ND', yieldRate: 0.83, wastageKg: 900, productionDaysPerTon: 1.2, qaDays: 2, machineRequired: 'RE05' },
  { code: 'VAV-BH004-LAA-98', codeTW: 'VMX-BH004-LAA-98', nameVN: 'Nha Đam Không Đường 98', nameZH: '無糖蘆薈98', line: 'AV', yieldRate: 0.93, wastageKg: 600, productionDaysPerTon: 0.5, qaDays: 3, machineRequired: 'KM07' },
];

export const PLANNING_ORDERS: Order[] = [
  { id: '1', vnCode: 'VN-26010045-001', twCode: 'TW001-26-001', productCode: 'VAV-AI266-HAA-07', productCodeTW: 'VMX-AI266-HAA-07', productName: 'Nha Đam Lô Hội 07', productNameZH: '蘆薈飲料07', productLine: 'AV', customer: 'TW001 Đài Loan', region: 'TW001', orderDate: '2026-01-15', qty: 12000, qtyProduced: 12000, qtyShipped: 8000, deliveryDate: '2026-03-10', status: 'CX' },
  { id: '2', vnCode: 'VN-26010046-001', twCode: 'TW002-26-002', productCode: 'VLC-AP097-FAD-85', productCodeTW: 'VMX-AP097-FAD-85', productName: 'Nước Trái Cây TH 85', productNameZH: '綜合果汁85', productLine: 'GV', customer: 'TW002 Đài Loan', region: 'TW002', orderDate: '2026-01-20', qty: 8000, qtyProduced: 5000, qtyShipped: 0, deliveryDate: '2026-04-15', status: 'DL' },
  { id: '3', vnCode: 'VN-26020012-001', twCode: '', productCode: 'VND-NC001-HAA-20', productCodeTW: 'VMX-NC001-HAA-20', productName: 'Thạch Dừa Hạt Lựu 20kg', productNameZH: '椰果粒20kg', productLine: 'ND', customer: 'Khách VN Nội Tiêu', region: 'VN', orderDate: '2026-02-01', qty: 5000, qtyProduced: 5000, qtyShipped: 5000, deliveryDate: '2026-03-05', status: 'DX' },
  { id: '4', vnCode: 'VN-26020018-001', twCode: 'SEA-26-018', productCode: 'VKM-AP104-FAL-08', productCodeTW: 'VMX-AP104-FAL-08', productName: 'Nước Trái Cây Nhiệt Đới 08', productNameZH: '熱帶果汁08', productLine: 'GV', customer: 'Công ty Đông Nam Á', region: 'ĐNA', orderDate: '2026-02-10', qty: 15000, qtyProduced: 0, qtyShipped: 0, deliveryDate: '2026-05-20', status: 'CH', note: 'Chưa có DECAN' },
  { id: '5', vnCode: 'VN-26020020-001', twCode: 'EU-26-020', productCode: 'VPS-AC156-FAD-50', productCodeTW: 'VMX-AC156-FAD-50', productName: 'Gel Lô Hội 50ml', productNameZH: '蘆薈凝膠50ml', productLine: 'AV', customer: 'Euro Foods Co.', region: 'ÂuMỹ', orderDate: '2026-02-12', qty: 6000, qtyProduced: 0, qtyShipped: 0, deliveryDate: '2026-06-01', status: 'XN' },
  { id: '6', vnCode: 'VN-26030001-001', twCode: 'SH-26-001', productCode: 'VAV-AI270-HAA-25', productCodeTW: 'VMX-AI270-HAA-25', productName: 'Nha Đam Lô Hội 25', productNameZH: '蘆薈飲料25', productLine: 'AV', customer: 'Thượng Hải Import Co.', region: 'TQ', orderDate: '2026-03-01', qty: 10000, qtyProduced: 3000, qtyShipped: 0, deliveryDate: '2026-05-15', status: 'DL' },
  { id: '7', vnCode: 'VN-26030005-001', twCode: 'KR-26-005', productCode: 'VND-NC002-HAA-50', productCodeTW: 'VMX-NC002-HAA-50', productName: 'Thạch Dừa Tấm Mỏng 50kg', productNameZH: '薄片椰果50kg', productLine: 'ND', customer: 'Korean Foods Ltd.', region: 'Hàn/Nhật', orderDate: '2026-03-05', qty: 4000, qtyProduced: 0, qtyShipped: 0, deliveryDate: '2026-07-10', status: 'CH' },
  { id: '8', vnCode: 'VN-26030008-001', twCode: 'TW001-26-008', productCode: 'VAV-BH004-LAA-98', productCodeTW: 'VMX-BH004-LAA-98', productName: 'Nha Đam Không Đường 98', productNameZH: '無糖蘆薈98', productLine: 'AV', customer: 'TW001 Đài Loan', region: 'TW001', orderDate: '2026-03-08', qty: 9000, qtyProduced: 1500, qtyShipped: 0, deliveryDate: '2026-05-30', status: 'DL' },
  { id: '9', vnCode: 'VN-26010030-001', twCode: 'VN-INT-030', productCode: 'VLC-AP097-FAD-85', productCodeTW: 'VMX-AP097-FAD-85', productName: 'Nước Trái Cây TH 85', productNameZH: '綜合果汁85', productLine: 'GV', customer: 'Nhà phân phối VN', region: 'VN', orderDate: '2026-01-30', qty: 3000, qtyProduced: 3000, qtyShipped: 3000, deliveryDate: '2026-02-28', status: 'DX' },
  { id: '10', vnCode: 'VN-26020025-001', twCode: 'TW002-26-025', productCode: 'VND-NC001-HAA-20', productCodeTW: 'VMX-NC001-HAA-20', productName: 'Thạch Dừa Hạt Lựu 20kg', productNameZH: '椰果粒20kg', productLine: 'ND', customer: 'TW002 Đài Loan', region: 'TW002', orderDate: '2026-02-25', qty: 7000, qtyProduced: 0, qtyShipped: 0, deliveryDate: '2026-06-15', status: 'CH', note: 'Đang chờ xác nhận nguyên liệu' },
  { id: '11', vnCode: 'VN-26010010-001', twCode: 'SEA-26-010', productCode: 'VAV-AI266-HAA-07', productCodeTW: 'VMX-AI266-HAA-07', productName: 'Nha Đam Lô Hội 07', productNameZH: '蘆薈飲料07', productLine: 'AV', customer: 'Singapore Distributor', region: 'ĐNA', orderDate: '2026-01-10', qty: 4500, qtyProduced: 4500, qtyShipped: 4500, deliveryDate: '2026-02-20', status: 'DX' },
  { id: '12', vnCode: 'VN-26030015-001', twCode: 'EU-26-015', productCode: 'VKM-AP104-FAL-08', productCodeTW: 'VMX-AP104-FAL-08', productName: 'Nước Trái Cây Nhiệt Đới 08', productNameZH: '熱帶果汁08', productLine: 'GV', customer: 'US Foods Import', region: 'ÂuMỹ', orderDate: '2026-03-15', qty: 20000, qtyProduced: 0, qtyShipped: 0, deliveryDate: '2026-08-01', status: 'CH' },
];

export const PLANNING_INVENTORY: Material[] = [
  { id: 'm1', codeVN: 'VNL-ALOEVERA-001', codeTW: 'TWM-ALOEVERA-001', nameVN: 'Nha đam thô (Lô Hội tươi)', nameZH: '新鮮蘆薈原料', type: 'raw', unit: 'kg', stockWarehouse: 8500, stockSX1: 1200, stockSX2: 0, stockSX4: 0, expiryDate: '2026-04-15', leadTimeDays: 7, origin: 'domestic', seasonal: true, supplier: 'Công ty Nha Đam Bình Thuận' },
  { id: 'm2', codeVN: 'VNL-SUGAR-001', codeTW: 'TWM-SUGAR-001', nameVN: 'Đường tinh luyện RS', nameZH: '精製白糖RS', type: 'raw', unit: 'kg', stockWarehouse: 25000, stockSX1: 3000, stockSX2: 2000, stockSX4: 500, expiryDate: '2026-12-31', leadTimeDays: 5, origin: 'domestic', seasonal: false, supplier: 'Đường Biên Hòa' },
  { id: 'm3', codeVN: 'VNL-NATA-RAW-001', codeTW: 'TWM-NATA-RAW-001', nameVN: 'Thạch dừa thô (chưa xử lý)', nameZH: '生椰果(未加工)', type: 'raw', unit: 'kg', stockWarehouse: 12000, stockSX1: 0, stockSX2: 4500, stockSX4: 0, expiryDate: '2026-04-30', leadTimeDays: 14, origin: 'domestic', seasonal: false, supplier: 'HTX Thạch Dừa Bến Tre' },
  { id: 'm4', codeVN: 'VNL-JUICE-APPLE-001', codeTW: 'TWM-JUICE-APPLE-001', nameVN: 'Nước táo cô đặc NFC', nameZH: '蘋果濃縮汁NFC', type: 'raw', unit: 'kg', stockWarehouse: 3200, stockSX1: 0, stockSX2: 0, stockSX4: 800, expiryDate: '2026-05-20', leadTimeDays: 45, origin: 'import', seasonal: false, supplier: 'Taiwan Juice Co.' },
  { id: 'm5', codeVN: 'VNL-JUICE-PASSION-001', codeTW: 'TWM-JUICE-PASSION-001', nameVN: 'Nước chanh leo cô đặc', nameZH: '百香果濃縮汁', type: 'raw', unit: 'kg', stockWarehouse: 1800, stockSX1: 0, stockSX2: 0, stockSX4: 200, expiryDate: '2026-03-31', leadTimeDays: 30, origin: 'domestic', seasonal: true, supplier: 'Đắk Lắk Passion Fruit Co.' },
  { id: 'm6', codeVN: 'VBT-ALOEGEL-001', codeTW: 'TWM-ALOEGEL-001', nameVN: 'BTP: Gel nha đam đã xử lý', nameZH: '半成品:蘆薈凝膠', type: 'semi', unit: 'kg', stockWarehouse: 4500, stockSX1: 800, stockSX2: 0, stockSX4: 0, expiryDate: '2026-04-10', leadTimeDays: 3, origin: 'domestic', seasonal: false, supplier: 'Nội bộ' },
  { id: 'm7', codeVN: 'VBT-NATA-CUT-001', codeTW: 'TWM-NATA-CUT-001', nameVN: 'BTP: Thạch dừa đã cắt hạt', nameZH: '半成品:椰果粒', type: 'semi', unit: 'kg', stockWarehouse: 6800, stockSX1: 0, stockSX2: 2200, stockSX4: 0, expiryDate: '2026-04-05', leadTimeDays: 21, origin: 'domestic', seasonal: false, supplier: 'Nội bộ' },
  { id: 'm8', codeVN: 'VPL-BOTTLE-500-001', codeTW: 'TWM-BOTTLE-500-001', nameVN: 'Chai nhựa PET 500ml', nameZH: 'PET瓶500ml', type: 'auxiliary', unit: 'cái', stockWarehouse: 150000, stockSX1: 20000, stockSX2: 15000, stockSX4: 5000, expiryDate: '2028-12-31', leadTimeDays: 21, origin: 'domestic', seasonal: false, supplier: 'Bao bì Tân Tiến' },
  { id: 'm9', codeVN: 'VPL-DECAN-AV07-001', codeTW: 'TWM-DECAN-AV07-001', nameVN: 'Decal nhãn VAV-AI266-HAA-07', nameZH: '標籤VMX-AI266-HAA-07', type: 'auxiliary', unit: 'cái', stockWarehouse: 45000, stockSX1: 8000, stockSX2: 0, stockSX4: 0, expiryDate: '2027-06-30', leadTimeDays: 30, origin: 'import', seasonal: false, supplier: 'Taiwan Label Co.' },
  { id: 'm10', codeVN: 'VTP-ALOEVERA-07-001', codeTW: 'TWM-ALOEVERA-07-001', nameVN: 'TP: Nha Đam Lô Hội 07 (thành phẩm)', nameZH: '成品:蘆薈飲料07', type: 'finished', unit: 'kg', stockWarehouse: 8000, stockSX1: 0, stockSX2: 0, stockSX4: 0, expiryDate: '2026-03-15', leadTimeDays: 0, origin: 'domestic', seasonal: false, supplier: 'Nội bộ' },
  { id: 'm11', codeVN: 'VNL-CITRIC-001', codeTW: 'TWM-CITRIC-001', nameVN: 'Axit citric (phụ gia)', nameZH: '檸檬酸(添加劑)', type: 'auxiliary', unit: 'kg', stockWarehouse: 850, stockSX1: 100, stockSX2: 50, stockSX4: 0, expiryDate: '2026-07-15', leadTimeDays: 14, origin: 'import', seasonal: false, supplier: 'Chem Import VN' },
  { id: 'm12', codeVN: 'VTP-NATA-20-001', codeTW: 'TWM-NATA-20-001', nameVN: 'TP: Thạch Dừa Hạt Lựu 20kg', nameZH: '成品:椰果粒20kg', type: 'finished', unit: 'kg', stockWarehouse: 5200, stockSX1: 0, stockSX2: 0, stockSX4: 0, expiryDate: '2026-02-10', leadTimeDays: 0, origin: 'domestic', seasonal: false, supplier: 'Nội bộ' },
];

export const PLANNING_SLOTS: ProductionSlot[] = [
  { id: 'ps1', date: d(-2), machine: 'KM07', shift: 'day',   orderId: '1', productCode: 'VAV-AI266-HAA-07', productName: 'Nha Đam Lô Hội 07',      productLine: 'AV', plannedQty: 2000, actualQty: 1980, lotNo: 'L26-KM07-001', status: 'done' },
  { id: 'ps2', date: d(-2), machine: 'KM07', shift: 'night', orderId: '8', productCode: 'VAV-BH004-LAA-98', productName: 'Nha Đam KĐường 98',       productLine: 'AV', plannedQty: 1500, actualQty: 1500, lotNo: 'L26-KM07-002', status: 'done' },
  { id: 'ps3', date: d(-1), machine: 'WM01', shift: 'day',   orderId: '2', productCode: 'VLC-AP097-FAD-85', productName: 'Nước Trái Cây TH 85',      productLine: 'GV', plannedQty: 2500, actualQty: 2300, lotNo: 'L26-WM01-001', status: 'done' },
  { id: 'ps4', date: d(-1), machine: 'RE05', shift: 'day',   orderId: '3', productCode: 'VND-NC001-HAA-20', productName: 'Thạch Dừa Hạt Lựu',        productLine: 'ND', plannedQty: 1800, actualQty: 1800, lotNo: 'L26-RE05-001', status: 'done' },
  { id: 'ps5', date: d(0),  machine: 'KM07', shift: 'day',   orderId: '6', productCode: 'VAV-AI270-HAA-25', productName: 'Nha Đam Lô Hội 25',        productLine: 'AV', plannedQty: 3000, actualQty: 1200, lotNo: 'L26-KM07-003', status: 'in-progress' },
  { id: 'ps6', date: d(0),  machine: 'GA01', shift: 'day',   orderId: '2', productCode: 'VKM-AP104-FAL-08', productName: 'Nước Trái Cây NĐới 08',    productLine: 'GV', plannedQty: 2000, actualQty: null, lotNo: 'L26-GA01-001', status: 'planned' },
  { id: 'ps7', date: d(0),  machine: 'RE05', shift: 'night', orderId: '8', productCode: 'VAV-BH004-LAA-98', productName: 'Nha Đam KĐường 98',       productLine: 'AV', plannedQty: 1500, actualQty: null, lotNo: 'L26-RE05-002', status: 'planned' },
  { id: 'ps8', date: d(1),  machine: 'KM07', shift: 'day',   orderId: '6', productCode: 'VAV-AI270-HAA-25', productName: 'Nha Đam Lô Hội 25',        productLine: 'AV', plannedQty: 3000, actualQty: null, lotNo: 'L26-KM07-004', status: 'planned' },
  { id: 'ps9', date: d(1),  machine: 'WM01', shift: 'day',   orderId: '2', productCode: 'VLC-AP097-FAD-85', productName: 'Nước Trái Cây TH 85',      productLine: 'GV', plannedQty: 2500, actualQty: null, lotNo: 'L26-WM01-002', status: 'planned' },
  { id: 'ps10', date: d(2), machine: 'GA01', shift: 'day',   orderId: '2', productCode: 'VKM-AP104-FAL-08', productName: 'Nước Trái Cây NĐới 08',    productLine: 'GV', plannedQty: 2000, actualQty: null, lotNo: 'L26-GA01-002', status: 'planned' },
  { id: 'ps11', date: d(2), machine: 'RE05', shift: 'day',   orderId: '8', productCode: 'VAV-BH004-LAA-98', productName: 'Nha Đam KĐường 98',       productLine: 'AV', plannedQty: 2000, actualQty: null, lotNo: 'L26-RE05-003', status: 'planned' },
  { id: 'ps12', date: d(3), machine: 'KM07', shift: 'day',   orderId: '8', productCode: 'VAV-BH004-LAA-98', productName: 'Nha Đam KĐường 98',       productLine: 'AV', plannedQty: 2000, actualQty: null, lotNo: 'L26-KM07-005', status: 'planned' },
  { id: 'ps13', date: d(3), machine: 'WM01', shift: 'night', orderId: '2', productCode: 'VLC-AP097-FAD-85', productName: 'Nước Trái Cây TH 85',      productLine: 'GV', plannedQty: 2500, actualQty: null, lotNo: 'L26-WM01-003', status: 'planned' },
  { id: 'ps14', date: d(4), machine: 'RE05', shift: 'day',   orderId: '6', productCode: 'VAV-AI270-HAA-25', productName: 'Nha Đam Lô Hội 25',        productLine: 'AV', plannedQty: 4000, actualQty: null, lotNo: 'L26-RE05-004', status: 'planned' },
];

export const PLANNING_MACHINES = ['KM07', 'WM01', 'GA01', 'RE05'];

export const PLANNING_MACHINE_LABELS: Record<string, { vi: string; zh: string }> = {
  KM07: { vi: 'Dây chuyền KM07 (AV/ND)', zh: 'KM07產線(蘆薈/椰果)' },
  WM01: { vi: 'Dây chuyền WM01 (GV)',    zh: 'WM01產線(果汁)' },
  GA01: { vi: 'Dây chuyền GA01 (GV)',    zh: 'GA01產線(果汁)' },
  RE05: { vi: 'Dây chuyền RE05 (AV/ND)', zh: 'RE05產線(蘆薈/椰果)' },
};
