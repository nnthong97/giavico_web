import { Injectable, signal, computed } from '@angular/core';
import { DashboardStats, Material, MaterialType, Order, OrderStatus, Product, ProductionSlot } from '../models/planning.model';
import { PLANNING_INVENTORY, PLANNING_ORDERS, PLANNING_PRODUCTS, PLANNING_SLOTS } from '../data/planning-mock.data';

@Injectable({ providedIn: 'root' })
export class PlanningService {
  readonly selectedLine = signal<'all' | 'AV' | 'ND' | 'GV'>('all');

  readonly orders = signal<Order[]>(PLANNING_ORDERS);
  readonly materials = signal<Material[]>(PLANNING_INVENTORY);
  readonly products = signal<Product[]>(PLANNING_PRODUCTS);
  readonly slots = signal<ProductionSlot[]>(PLANNING_SLOTS);

  readonly stats = computed<DashboardStats>(() => {
    const orders = this.orders();
    const materials = this.materials();
    const slots = this.slots();
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const todaySlots = slots.filter(s => s.date === today.toISOString().split('T')[0]);
    const planned = todaySlots.reduce((acc, s) => acc + s.plannedQty, 0);
    const actual  = todaySlots.reduce((acc, s) => acc + (s.actualQty ?? 0), 0);

    const expiryAlerts = materials.filter(m => {
      if (!m.expiryDate) return false;
      const exp = new Date(m.expiryDate);
      const diff = Math.round((exp.getTime() - today.getTime()) / 86400000);
      return diff >= 0 && diff < 30;
    }).length;

    return {
      orders: {
        total:       orders.length,
        inProduction: orders.filter(o => o.status === 'DL').length,
        readyToShip:  orders.filter(o => o.status === 'CX').length,
        shipped:      orders.filter(o => o.status === 'DX').length,
        pending:      orders.filter(o => o.status === 'CH').length,
      },
      expiryAlerts,
      agedCount: 35,
      todayPlan: { planned, actual },
    };
  });

  getOrdersByFilter(line: string, status: string, search: string): Order[] {
    return this.orders().filter(o => {
      if (line && line !== 'all' && o.productLine !== line) return false;
      if (status && status !== 'all' && o.status !== status) return false;
      if (search) {
        const q = search.toLowerCase();
        return o.vnCode.toLowerCase().includes(q)
          || o.productName.toLowerCase().includes(q)
          || o.customer.toLowerCase().includes(q)
          || o.twCode.toLowerCase().includes(q);
      }
      return true;
    });
  }

  getMaterialsByFilter(type: string, search: string): Material[] {
    return this.materials().filter(m => {
      if (type && type !== 'all' && m.type !== type) return false;
      if (search) {
        const q = search.toLowerCase();
        return m.codeVN.toLowerCase().includes(q)
          || m.nameVN.toLowerCase().includes(q)
          || m.nameZH.toLowerCase().includes(q);
      }
      return true;
    });
  }

  getSlotFor(date: string, machine: string, shift: string): ProductionSlot | undefined {
    return this.slots().find(s => s.date === date && s.machine === machine && s.shift === shift);
  }

  getProduct(code: string): Product | undefined {
    return this.products().find(p => p.code === code);
  }

  todayStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  addDays(base: string, n: number): string {
    const dt = new Date(base);
    dt.setDate(dt.getDate() + n);
    return dt.toISOString().split('T')[0];
  }

  getDaysLeft(expiryDate: string): number {
    if (!expiryDate) return 999;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    return Math.round((exp.getTime() - today.getTime()) / 86400000);
  }

  getRisk(daysLeft: number, type: MaterialType): 'expired' | 'danger' | 'warning' | 'safe' {
    if (type === 'auxiliary' && daysLeft > 180) return 'safe';
    if (daysLeft < 0)  return 'expired';
    if (daysLeft < 14) return 'danger';
    if (daysLeft < 45) return 'warning';
    return 'safe';
  }
}
