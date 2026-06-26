/**
 * GV Auto-Scheduler – Pure function, no Angular deps.
 *
 * Logic (từ GV排程表格 + GV_SCHEDULE_ANALYSIS.md):
 * 1. Sắp xếp đơn theo ETD (sớm nhất trước – FEFO)
 * 2. Mỗi đơn: tính latestStart = ETD - qaDays - 1 (ngày đóng cont)
 * 3. Forward-fill từ today, fill slot trên máy tương ứng (day → night)
 * 4. Nếu hết slot trước latestStart → cảnh báo ETD at risk
 * 5. Sinh sugar task, material request, packaging warning
 */

import {
  GV_PACKAGING, GV_SUGAR_LEAD_DAYS,
  GVMaterialRequest, GVOrderInput, GVProductConfig,
  GVScheduleResult, GVScheduledSlot, GVScheduleWarning,
  GVSugarTask, GVMachineConfig,
} from '../models/gv.model';

// ─── Date helpers ──────────────────────────────────────────────────────────────
export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

// ─── Main scheduler ────────────────────────────────────────────────────────────
export function scheduleGVOrders(
  orders: GVOrderInput[],
  products: GVProductConfig[],
  machines: GVMachineConfig[],
  today: string,
  preOccupied: Set<string> = new Set(), // 'machine:date:shift'
): GVScheduleResult {
  // Sort: earliest ETD first (highest urgency)
  const sorted = [...orders].sort((a, b) => a.etd.localeCompare(b.etd));

  const occupied = new Set<string>(preOccupied);
  const slots: GVScheduledSlot[] = [];
  const warnings: GVScheduleWarning[] = [];
  const sugarTasks: GVSugarTask[] = [];
  const materialRequests: GVMaterialRequest[] = [];

  let slotIdx = 0;

  for (const order of sorted) {
    const product = products.find(p => p.productCode === order.productCode);
    if (!product) {
      warnings.push({
        orderId: order.orderId,
        type: 'no-slot',
        messageVN: `Không tìm thấy cấu hình sản phẩm cho mã ${order.productCode}`,
        messageZH: `找不到產品設定 ${order.productCode}`,
        severity: 'error',
      });
      continue;
    }

    const machine = machines.find(m => m.code === product.machineRequired);
    if (!machine) continue;

    // ── Small order check (< 3 MT = 3,000 kg) ──────────────────────────────
    if (order.qty < 3_000) {
      warnings.push({
        orderId: order.orderId,
        type: 'small-order',
        messageVN: `Đơn ${order.orderId}: SL ${(order.qty / 1000).toFixed(1)} MT < 3 MT – cần xác nhận giá trước khi lên lịch`,
        messageZH: `訂單 ${order.orderId}: 數量 ${(order.qty / 1000).toFixed(1)} MT < 3MT，需先確認報價`,
        severity: 'warning',
      });
    }

    // ── Calculate deadlines ─────────────────────────────────────────────────
    // latestStart: ngày SX muộn nhất để kịp ETD
    const latestStart = addDays(order.etd, -(product.qaDays + 1));
    const capPerShift = machine.capacityKgPerShift;

    // ── Forward-fill slots from today ───────────────────────────────────────
    let remaining = order.qty;
    let searchDate = today;
    let lotNum = 1;
    const orderSlots: GVScheduledSlot[] = [];
    const MAX_SEARCH_DAYS = 90;
    let daysSearched = 0;

    while (remaining > 0 && daysSearched < MAX_SEARCH_DAYS) {
      if (searchDate > latestStart) {
        warnings.push({
          orderId: order.orderId,
          type: 'etd-risk',
          messageVN: `Đơn ${order.orderId}: Máy ${product.machineRequired} bận – không thể SX xong trước ${latestStart} (ETD ${order.etd})`,
          messageZH: `訂單 ${order.orderId}: ${product.machineRequired} 機台不足，無法在 ${latestStart} 前完成（交期 ${order.etd}）`,
          severity: 'error',
        });
        break;
      }

      for (const shift of ['day', 'night'] as const) {
        if (remaining <= 0) break;
        const key = `${product.machineRequired}:${searchDate}:${shift}`;
        if (!occupied.has(key)) {
          const qty = Math.min(remaining, capPerShift);
          const rawMaterialKg = Math.ceil(qty / product.yieldRate);
          orderSlots.push({
            id: `gv-auto-${++slotIdx}`,
            date: searchDate,
            machine: product.machineRequired,
            shift,
            orderId: order.orderId,
            productCode: order.productCode,
            productName: product.nameVN,
            productNameZH: product.nameZH,
            plannedQty: qty,
            rawMaterialKg,
            lotNo: `GV-${order.orderId.slice(-3)}-${String(lotNum++).padStart(2, '0')}`,
          });
          occupied.add(key);
          remaining -= qty;
        }
      }

      searchDate = addDays(searchDate, 1);
      daysSearched++;
    }

    slots.push(...orderSlots);

    if (orderSlots.length === 0) continue;

    const firstProdDate = orderSlots[0].date;

    // ── Sugar preparation task ──────────────────────────────────────────────
    const sugarLeadDays = GV_SUGAR_LEAD_DAYS[product.sugarType] ?? 2;
    const heatDate = addDays(firstProdDate, -sugarLeadDays);
    const totalSugarKg = Math.ceil(order.qty * product.sugarRateKgPerKg);

    sugarTasks.push({
      orderId: order.orderId,
      productCode: order.productCode,
      sugarType: product.sugarType,
      sugarQtyKg: totalSugarKg,
      heatDate,
      readyDate: firstProdDate,
    });

    if (heatDate <= today) {
      warnings.push({
        orderId: order.orderId,
        type: 'sugar-late',
        messageVN: `Đơn ${order.orderId}: ${product.sugarType} cần gia nhiệt từ ${heatDate} (${sugarLeadDays} ngày trước SX) – đã qua hoặc quá gấp!`,
        messageZH: `訂單 ${order.orderId}: ${product.sugarType} 需於 ${heatDate} 開始融糖（距生產 ${sugarLeadDays} 天），已過或太緊迫！`,
        severity: 'error',
      });
    } else if (daysBetween(today, heatDate) <= 3) {
      warnings.push({
        orderId: order.orderId,
        type: 'sugar-late',
        messageVN: `Đơn ${order.orderId}: ${product.sugarType} cần gia nhiệt trong ${daysBetween(today, heatDate)} ngày (${heatDate}) – gấp!`,
        messageZH: `訂單 ${order.orderId}: ${product.sugarType} 需於 ${daysBetween(today, heatDate)} 天後（${heatDate}）開始融糖，請盡快安排！`,
        severity: 'warning',
      });
    }

    // ── Decal / Label deadline ──────────────────────────────────────────────
    const decalDeadline = addDays(firstProdDate, -GV_PACKAGING.DECAL_WORKING_DAYS);
    const decalDaysLeft = daysBetween(today, decalDeadline);
    if (decalDaysLeft < 0) {
      warnings.push({
        orderId: order.orderId,
        type: 'decal-late',
        messageVN: `Đơn ${order.orderId}: Decal phải có trước ${decalDeadline} – đã qua ${Math.abs(decalDaysLeft)} ngày!`,
        messageZH: `訂單 ${order.orderId}: Decal 需於 ${decalDeadline} 前到位，已逾期 ${Math.abs(decalDaysLeft)} 天！`,
        severity: 'error',
      });
    } else if (decalDaysLeft <= 5) {
      warnings.push({
        orderId: order.orderId,
        type: 'decal-late',
        messageVN: `Đơn ${order.orderId}: Decal cần có trước ${decalDeadline} – còn ${decalDaysLeft} ngày!`,
        messageZH: `訂單 ${order.orderId}: Decal 需於 ${decalDeadline} 前到位，僅剩 ${decalDaysLeft} 天！`,
        severity: 'warning',
      });
    }

    // ── Bottle (bao bì chai) deadline ───────────────────────────────────────
    const bottleLT = product.bottleOrigin === 'import'
      ? GV_PACKAGING.BOTTLE_IMPORT_DAYS
      : GV_PACKAGING.BOTTLE_DOMESTIC_DAYS;
    const bottleOrderDeadline = addDays(firstProdDate, -bottleLT);
    const bottleDaysLeft = daysBetween(today, bottleOrderDeadline);

    if (product.bottleOrigin === 'import' && bottleDaysLeft < 0) {
      warnings.push({
        orderId: order.orderId,
        type: 'bottle-late',
        messageVN: `Đơn ${order.orderId}: Chai nhập khẩu TW (LT ${bottleLT}d) – hạn đặt mua ${bottleOrderDeadline} đã qua!`,
        messageZH: `訂單 ${order.orderId}: TW進口瓶（前置 ${bottleLT} 天），訂購截止 ${bottleOrderDeadline} 已過！`,
        severity: 'error',
      });
    } else if (product.bottleOrigin === 'import' && bottleDaysLeft <= 5) {
      warnings.push({
        orderId: order.orderId,
        type: 'bottle-late',
        messageVN: `Đơn ${order.orderId}: Cần đặt chai nhập TW trước ${bottleOrderDeadline} – còn ${bottleDaysLeft} ngày!`,
        messageZH: `訂單 ${order.orderId}: 需於 ${bottleOrderDeadline} 前訂購TW進口瓶，僅剩 ${bottleDaysLeft} 天！`,
        severity: 'warning',
      });
    }

    // ── Material request (Phiếu NHU CẦU NL) ────────────────────────────────
    const totalRawKg = orderSlots.reduce((s, sl) => s + sl.rawMaterialKg, 0);

    // Group by date (mỗi ngày SX cần NL ngày hôm trước)
    const dateGroups = new Map<string, number>();
    for (const sl of orderSlots) {
      const nlDate = addDays(sl.date, -1);
      dateGroups.set(nlDate, (dateGroups.get(nlDate) ?? 0) + sl.rawMaterialKg);
    }

    for (const [nlDate, kgNeeded] of dateGroups) {
      materialRequests.push({
        orderId: order.orderId,
        materialCode: product.rawMaterialCode,
        materialNameVN: product.rawMaterialNameVN,
        quantityKg: kgNeeded,
        neededByDate: nlDate,
      });
    }
  }

  return { slots, warnings, sugarTasks, materialRequests };
}

/** Build occupied set from existing slots */
export function buildOccupiedSet(
  existingSlots: Array<{ machine: string; date: string; shift: string }>
): Set<string> {
  return new Set(existingSlots.map(s => `${s.machine}:${s.date}:${s.shift}`));
}
