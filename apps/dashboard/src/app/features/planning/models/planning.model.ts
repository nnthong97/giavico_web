export type OrderStatus = 'CH' | 'DL' | 'TK' | 'CX' | 'DX' | 'HU' | 'NG' | 'XN' | 'HM';
export type ProductLine = 'AV' | 'ND' | 'GV';
export type MaterialType = 'raw' | 'semi' | 'auxiliary' | 'finished';
export type ShiftType = 'day' | 'night';
export type SlotStatus = 'planned' | 'in-progress' | 'done' | 'delayed';

export interface Order {
  id: string;
  vnCode: string;
  twCode: string;
  productCode: string;
  productCodeTW: string;
  productName: string;
  productNameZH: string;
  productLine: ProductLine;
  customer: string;
  region: string;
  orderDate: string;
  qty: number;
  qtyProduced: number;
  qtyShipped: number;
  deliveryDate: string;
  status: OrderStatus;
  note?: string;
}

export interface Material {
  id: string;
  codeVN: string;
  codeTW: string;
  nameVN: string;
  nameZH: string;
  type: MaterialType;
  unit: string;
  stockWarehouse: number;
  stockSX1: number;
  stockSX2: number;
  stockSX4: number;
  expiryDate: string;
  leadTimeDays: number;
  origin: 'domestic' | 'import';
  seasonal: boolean;
  supplier: string;
}

export interface ProductionSlot {
  id: string;
  date: string;
  machine: string;
  shift: ShiftType;
  orderId: string;
  productCode: string;
  productName: string;
  productLine: ProductLine;
  plannedQty: number;
  actualQty: number | null;
  lotNo: string;
  status: SlotStatus;
}

export interface Product {
  code: string;
  codeTW: string;
  nameVN: string;
  nameZH: string;
  line: ProductLine;
  yieldRate: number;
  wastageKg: number;
  productionDaysPerTon: number;
  qaDays: number;
  machineRequired: string;
}

export interface DashboardStats {
  orders: { total: number; inProduction: number; readyToShip: number; shipped: number; pending: number };
  expiryAlerts: number;
  agedCount: number;
  todayPlan: { planned: number; actual: number };
}
