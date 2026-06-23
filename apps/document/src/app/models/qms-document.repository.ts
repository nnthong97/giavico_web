import { Injectable, computed, signal } from '@angular/core';
import { Observable, defer, delay, map, of, throwError } from 'rxjs';
import { QmsDocument, QmsFilters, QmsStatus, definitionFor } from './qms.models';

const STORAGE_KEY = 'giavico.qms.documents.v1';
const now = () => new Date().toISOString();

const SEED: QmsDocument[] = [
  { id: 'qms-001', documentNumber: 'NPM-2026-001', type: 'NEW_PRODUCT_NOTICE', productCode: 'VN-MNG-001', productName: 'Mango Puree 28 Brix', status: 'PENDING_APPROVAL', createdAt: '2026-06-11T03:00:00Z', updatedAt: '2026-06-17T05:30:00Z', values: { vnProductCode: 'VN-MNG-001', productName: 'Mango Puree 28 Brix', packaging: '220 kg aseptic drum', brix: '28 +/- 1' }, approvals: [], auditTrail: [{ at: '2026-06-17T05:30:00Z', actor: 'Nguyen An', action: 'Submitted for approval' }] },
  { id: 'qms-002', documentNumber: 'ECR-2026-014', type: 'ENGINEERING_CHANGE_REQUEST', productCode: 'VN-PIN-007', productName: 'Pineapple Concentrate', status: 'APPROVED', createdAt: '2026-06-05T02:00:00Z', updatedAt: '2026-06-16T08:00:00Z', values: { productCode: 'VN-PIN-007', urgency: 'Normal', importance: 'A' }, approvals: [], auditTrail: [{ at: '2026-06-16T08:00:00Z', actor: 'QA Manager', action: 'Approved' }] },
  { id: 'qms-003', documentNumber: 'RMS-2026-008', type: 'RAW_MATERIAL_STANDARD', productCode: 'RM-SUG-003', productName: 'Refined sugar', status: 'RELEASED', createdAt: '2026-05-20T02:00:00Z', updatedAt: '2026-06-15T02:00:00Z', values: { materialCode: 'RM-SUG-003', rawMaterialName: 'Refined sugar', version: '03' }, approvals: [], auditTrail: [{ at: '2026-06-15T02:00:00Z', actor: 'Document Control', action: 'Released revision 03' }] },
];

@Injectable({ providedIn: 'root' })
export class QmsDocumentRepository {
  private readonly state = signal<QmsDocument[]>(this.read());
  readonly documents = this.state.asReadonly();
  readonly total = computed(() => this.state().length);

  list(filters?: Partial<QmsFilters>): Observable<QmsDocument[]> {
    return of(this.state()).pipe(delay(120), map((items) => items.filter((item) => this.matches(item, filters)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))));
  }

  get(id: string): Observable<QmsDocument> {
    return defer(() => {
      const found = this.state().find((item) => item.id === id);
      return found ? of(structuredClone(found)).pipe(delay(80)) : throwError(() => new Error('Document not found'));
    });
  }

  create(input: Pick<QmsDocument, 'type' | 'productCode' | 'productName' | 'values'>): Observable<QmsDocument> {
    const stamp = now();
    const sequence = String(this.state().length + 1).padStart(3, '0');
    const definition = definitionFor(input.type);
    const document: QmsDocument = {
      ...input, id: crypto.randomUUID(), documentNumber: `${definition.formNumber.split(' ')[0]}-${new Date().getFullYear()}-${sequence}`,
      status: 'DRAFT', createdAt: stamp, updatedAt: stamp,
      approvals: definition.approvals.map((role) => ({ role, approver: '', decision: 'WAITING' })),
      auditTrail: [{ at: stamp, actor: 'Current user', action: 'Created draft' }],
    };
    this.commit([document, ...this.state()]);
    return of(structuredClone(document)).pipe(delay(180));
  }

  update(id: string, input: Pick<QmsDocument, 'type' | 'productCode' | 'productName' | 'values' | 'approvals'>): Observable<QmsDocument> {
    const current = this.state().find((item) => item.id === id);
    if (!current) return throwError(() => new Error('Document not found'));
    const updated = { ...current, ...input, updatedAt: now(), auditTrail: [{ at: now(), actor: 'Current user', action: 'Updated document' }, ...current.auditTrail] };
    this.commit(this.state().map((item) => item.id === id ? updated : item));
    return of(structuredClone(updated)).pipe(delay(180));
  }

  delete(id: string): Observable<void> {
    this.commit(this.state().filter((item) => item.id !== id));
    return of(void 0).pipe(delay(120));
  }

  setStatus(id: string, status: QmsStatus): Observable<QmsDocument> {
    const current = this.state().find((item) => item.id === id);
    if (!current) return throwError(() => new Error('Document not found'));
    const updated = { ...current, status, updatedAt: now(), auditTrail: [{ at: now(), actor: 'Current user', action: `Status changed to ${status}` }, ...current.auditTrail] };
    this.commit(this.state().map((item) => item.id === id ? updated : item));
    return of(structuredClone(updated)).pipe(delay(120));
  }

  private matches(item: QmsDocument, filters?: Partial<QmsFilters>): boolean {
    if (!filters) return true;
    const term = filters.search?.trim().toLowerCase();
    return (!term || `${item.productCode} ${item.productName} ${item.documentNumber}`.toLowerCase().includes(term))
      && (!filters.type || item.type === filters.type) && (!filters.status || item.status === filters.status)
      && (!filters.from || item.createdAt.slice(0, 10) >= filters.from) && (!filters.to || item.createdAt.slice(0, 10) <= filters.to);
  }

  private commit(documents: QmsDocument[]): void {
    this.state.set(documents);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(documents)); } catch { /* SSR or disabled storage. */ }
  }

  private read(): QmsDocument[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || SEED; } catch { return SEED; }
  }
}
