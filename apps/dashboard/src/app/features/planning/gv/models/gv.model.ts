// GV (果汁 – Juice) domain models

export type GVMachineCode = 'KM07' | 'KM08' | 'RE05' | 'GA01';
export type GVSugarType = 'BCH001' | 'BCH011' | 'BCH047' | 'BCH048' | 'BTS009';

/** Product config đọc từ BCH001资料 + GV排程表格 */
export interface GVProductConfig {
  productCode: string;      // VN code, e.g. VKM-AP104-FAL-08
  productCodeTW: string;    // TW code, e.g. VMX-AP104-FAL-08
  nameVN: string;
  nameZH: string;
  rawMaterialCode: string;  // e.g. KM, WM, GA, RE, CO, DF, PS, LC
  rawMaterialNameVN: string;
  machineRequired: GVMachineCode;
  yieldRate: number;        // fraction 0–1, e.g. 0.87
  qaDays: number;           // QA hold days before container packing
  sugarType: GVSugarType;
  sugarRateKgPerKg: number; // kg sugar per kg finished product
  packageWeightG: number;   // gram per bottle/unit
  bottleOrigin: 'domestic' | 'import';
}

/** Machine config */
export interface GVMachineConfig {
  code: GVMachineCode;
  nameVN: string;
  nameZH: string;
  capacityKgPerShift: number;
  shiftsPerDay: 2;
  productFamilies: string[];  // e.g. ['VKM', 'VWM']
}

/** Sugar lead-time constants (days) derived from KỸ THUẬT email */
export const GV_SUGAR_LEAD_DAYS: Record<GVSugarType, number> = {
  BCH001: 2,   // standard sugar, 2 days prep
  BCH011: 3,   // dissolve sugar, 3 days
  BCH047: 5,   // 120h (5 days) holding temperature
  BCH048: 10,  // 10 days testing after heating
  BTS009: 7,   // 7 days testing
};

/** Packaging lead times (working days) – from 瓶裝包材採購進度 */
export const GV_PACKAGING = {
  DECAL_WORKING_DAYS: 14,   // must arrive 14 working days before production
  BOTTLE_DOMESTIC_DAYS: 8,
  BOTTLE_IMPORT_DAYS: 38,   // Taiwan preform – 36–38 days
  CAP_IMPORT_DAYS: 38,      // NA078 import cap
  BOX_DAYS: 12,
};

/** Input từ người dùng: danh sách đơn cần lên lịch */
export interface GVOrderInput {
  orderId: string;
  productCode: string;
  qty: number;    // kg
  etd: string;    // YYYY-MM-DD – Expected Delivery Date (giao hàng cho khách)
}

/** Một slot đã được lên lịch bởi auto-scheduler */
export interface GVScheduledSlot {
  id: string;
  date: string;
  machine: GVMachineCode;
  shift: 'day' | 'night';
  orderId: string;
  productCode: string;
  productName: string;
  productNameZH: string;
  plannedQty: number;       // kg
  rawMaterialKg: number;    // kg nguyên liệu tươi cần
  lotNo: string;
}

/** Cảnh báo phát sinh trong quá trình lên lịch */
export interface GVScheduleWarning {
  orderId: string;
  type: 'small-order' | 'sugar-late' | 'decal-late' | 'bottle-late' | 'etd-risk' | 'no-slot';
  messageVN: string;
  messageZH: string;
  severity: 'info' | 'warning' | 'error';
}

/** Task gia nhiệt đường được sinh ra từ scheduler */
export interface GVSugarTask {
  orderId: string;
  productCode: string;
  sugarType: GVSugarType;
  sugarQtyKg: number;
  heatDate: string;   // ngày bắt đầu gia nhiệt/hòa tan
  readyDate: string;  // ngày đường sẵn sàng dùng SX (= heatDate + lead days)
}

/** Phiếu yêu cầu nguyên liệu tươi */
export interface GVMaterialRequest {
  orderId: string;
  materialCode: string;
  materialNameVN: string;
  quantityKg: number;
  neededByDate: string;   // ngày cần có nguyên liệu tại xưởng
}

/** Kết quả đầu ra của GV Auto-Scheduler */
export interface GVScheduleResult {
  slots: GVScheduledSlot[];
  warnings: GVScheduleWarning[];
  sugarTasks: GVSugarTask[];
  materialRequests: GVMaterialRequest[];
}
