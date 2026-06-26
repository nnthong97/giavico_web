import { Injectable, computed, signal } from '@angular/core';
import { GVOrderInput, GVScheduleResult } from '../models/gv.model';
import { GV_EXISTING_SLOTS, GV_MACHINES, GV_PENDING_ORDERS, GV_PRODUCTS } from '../data/gv-mock.data';
import { buildOccupiedSet, scheduleGVOrders } from '../utils/gv-scheduler';

@Injectable({ providedIn: 'root' })
export class GvService {
  readonly products = GV_PRODUCTS;
  readonly machines = GV_MACHINES;

  /** Danh sách đơn đang chờ lên lịch (user có thể thêm/xóa) */
  readonly pendingOrders = signal<GVOrderInput[]>(
    GV_PENDING_ORDERS.filter(o => o.status !== 'DX').map(o => ({
      orderId: o.orderId,
      productCode: o.productCode,
      qty: o.qty,
      etd: o.etd,
    }))
  );

  /** Slots đã tồn tại (pre-occupied) */
  readonly existingSlots = signal(GV_EXISTING_SLOTS);

  /** Kết quả auto-schedule – null = chưa chạy */
  readonly scheduleResult = signal<GVScheduleResult | null>(null);

  /** Tất cả slots để hiển thị trên Gantt (existing + scheduled) */
  readonly allDisplaySlots = computed(() => {
    const result = this.scheduleResult();
    const existing = this.existingSlots();
    if (!result) return existing;
    return [...existing, ...result.slots.map(s => ({
      ...s,
      actualQty: null as number | null,
      status: 'planned' as const,
    }))];
  });

  today(): string {
    return new Date().toISOString().split('T')[0];
  }

  addDays(base: string, n: number): string {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  }

  /** Chạy auto-scheduler với danh sách đơn hiện tại */
  runScheduler(): void {
    const occupied = buildOccupiedSet(this.existingSlots());
    const result = scheduleGVOrders(
      this.pendingOrders(),
      this.products,
      this.machines,
      this.today(),
      occupied,
    );
    this.scheduleResult.set(result);
  }

  /** Reset kết quả scheduler */
  resetSchedule(): void {
    this.scheduleResult.set(null);
  }

  /** Thêm một đơn mới vào danh sách pending */
  addOrder(order: GVOrderInput): void {
    this.pendingOrders.update(list => [...list, order]);
    this.resetSchedule();
  }

  /** Xóa đơn khỏi danh sách */
  removeOrder(orderId: string): void {
    this.pendingOrders.update(list => list.filter(o => o.orderId !== orderId));
    this.resetSchedule();
  }

  /** Cập nhật đơn */
  updateOrder(orderId: string, patch: Partial<GVOrderInput>): void {
    this.pendingOrders.update(list =>
      list.map(o => o.orderId === orderId ? { ...o, ...patch } : o)
    );
    this.resetSchedule();
  }

  getSlotFor(date: string, machine: string, shift: string) {
    return this.allDisplaySlots().find(
      s => s.date === date && s.machine === machine && s.shift === shift
    );
  }

  getProductConfig(code: string) {
    return this.products.find(p => p.productCode === code);
  }

  getProductName(code: string, lang: 'vi' | 'zh-TW' | 'en') {
    const p = this.getProductConfig(code);
    if (!p) return code;
    return lang === 'zh-TW' ? p.nameZH : p.nameVN;
  }

  generateOrderId(): string {
    return `GV-NEW-${Date.now().toString().slice(-4)}`;
  }
}
