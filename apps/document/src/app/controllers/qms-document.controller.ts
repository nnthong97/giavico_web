import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApprovalStep, QmsDocument, QmsFilters, QmsStatus } from '../models/qms.models';
import { QmsDocumentRepository } from '../models/qms-document.repository';

@Injectable({ providedIn: 'root' })
export class QmsDocumentController {
  private readonly repository = inject(QmsDocumentRepository);

  readonly documents = this.repository.documents;
  readonly total = this.repository.total;

  list(filters?: Partial<QmsFilters>): Observable<QmsDocument[]> {
    return this.repository.list(filters);
  }

  get(id: string): Observable<QmsDocument> {
    return this.repository.get(id);
  }

  create(input: Pick<QmsDocument, 'type' | 'productCode' | 'productName' | 'values'>): Observable<QmsDocument> {
    return this.repository.create(input);
  }

  update(id: string, input: Pick<QmsDocument, 'type' | 'productCode' | 'productName' | 'values'> & { approvals: ApprovalStep[] }): Observable<QmsDocument> {
    return this.repository.update(id, input);
  }

  delete(id: string): Observable<void> {
    return this.repository.delete(id);
  }

  setStatus(id: string, status: QmsStatus): Observable<QmsDocument> {
    return this.repository.setStatus(id, status);
  }
}
