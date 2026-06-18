import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, delay, of, throwError } from 'rxjs';
import { ApiPage } from '../models/formulation.model';
import {
  RndDocumentDetail,
  RndDocumentSaveRequest,
  RndDocumentStatus,
  RndDocumentSummary,
  RndWorkflowRequest,
} from '../models/rnd-document.model';
import { GIAVICO_API_DOMAINS } from './giavico-api-domains';

@Injectable({ providedIn: 'root' })
export class RndDocumentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = GIAVICO_API_DOMAINS.rndDocuments;
  private readonly mockStorageKey = 'giavico.rnd-documents.mock.v1';

  public list(page = 0, size = 20, status?: RndDocumentStatus, search?: string): Observable<ApiPage<RndDocumentSummary>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (status) params = params.set('status', status);
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<ApiPage<RndDocumentSummary>>(this.apiUrl, { params }).pipe(
      catchError((error) => this.isOffline(error) ? this.mockList(page, size, status, search) : throwError(() => error))
    );
  }

  public get(id: string): Observable<RndDocumentDetail> {
    return this.http.get<RndDocumentDetail>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => this.isOffline(error) ? this.mockGet(id) : throwError(() => error))
    );
  }

  public create(request: RndDocumentSaveRequest): Observable<RndDocumentDetail> {
    return this.http.post<RndDocumentDetail>(this.apiUrl, request).pipe(
      catchError((error) => this.isOffline(error) ? this.mockCreate(request) : throwError(() => error))
    );
  }

  public update(id: string, request: RndDocumentSaveRequest): Observable<RndDocumentDetail> {
    return this.http.put<RndDocumentDetail>(`${this.apiUrl}/${id}`, request).pipe(
      catchError((error) => this.isOffline(error) ? this.mockUpdate(id, request) : throwError(() => error))
    );
  }

  public transition(id: string, action: string, request: RndWorkflowRequest): Observable<RndDocumentDetail> {
    return this.http.post<RndDocumentDetail>(`${this.apiUrl}/${id}/${action}`, request).pipe(
      catchError((error) => this.isOffline(error) ? this.mockTransition(id, action, request) : throwError(() => error))
    );
  }

  public pdfUrl(id: string): string {
    return `${this.apiUrl}/${id}/pdf`;
  }

  private isOffline(error: { status?: number }): boolean {
    return error?.status === 0;
  }

  private mockList(page: number, size: number, status?: RndDocumentStatus, search?: string): Observable<ApiPage<RndDocumentSummary>> {
    const term = search?.trim().toLowerCase();
    const matches = this.readMockDocuments().filter((document) =>
      (!status || document.status === status) &&
      (!term || `${document.documentNumber} ${document.title} ${document.productName}`.toLowerCase().includes(term))
    );
    const start = page * size;
    return of({ content: matches.slice(start, start + size), totalElements: matches.length, totalPages: Math.ceil(matches.length / size), size, number: page }).pipe(delay(120));
  }

  private mockGet(id: string): Observable<RndDocumentDetail> {
    const document = this.readMockDocuments().find((item) => item.uuid === id);
    return document ? of(document).pipe(delay(80)) : throwError(() => new Error('Document not found in mock storage'));
  }

  private mockCreate(request: RndDocumentSaveRequest): Observable<RndDocumentDetail> {
    const documents = this.readMockDocuments();
    const timestamp = new Date().toISOString();
    const sequence = String(documents.length + 1).padStart(3, '0');
    const document: RndDocumentDetail = {
      uuid: globalThis.crypto?.randomUUID?.() ?? `mock-${Date.now()}`,
      documentNumber: `RND-${new Date().getFullYear()}-${sequence}`,
      ...request,
      formulaUuid: request.formulaUuid ?? null,
      effectiveDate: request.effectiveDate ?? null,
      status: 'DRAFT',
      revision: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      approvals: [],
      revisions: [{ revision: 1, status: 'DRAFT', changedBy: request.owner, changeSummary: 'Draft created in mock mode', createdAt: timestamp }],
    };
    this.writeMockDocuments([document, ...documents]);
    return of(document).pipe(delay(180));
  }

  private mockUpdate(id: string, request: RndDocumentSaveRequest): Observable<RndDocumentDetail> {
    const documents = this.readMockDocuments();
    const current = documents.find((item) => item.uuid === id);
    if (!current) return throwError(() => new Error('Document not found in mock storage'));
    const timestamp = new Date().toISOString();
    const document: RndDocumentDetail = { ...current, ...request, formulaUuid: request.formulaUuid ?? null, effectiveDate: request.effectiveDate ?? null, updatedAt: timestamp };
    this.writeMockDocuments(documents.map((item) => item.uuid === id ? document : item));
    return of(document).pipe(delay(180));
  }

  private mockTransition(id: string, action: string, request: RndWorkflowRequest): Observable<RndDocumentDetail> {
    const documents = this.readMockDocuments();
    const current = documents.find((item) => item.uuid === id);
    if (!current) return throwError(() => new Error('Document not found in mock storage'));
    const statusByAction: Record<string, RndDocumentStatus> = { submit: 'SUBMITTED', 'start-review': 'UNDER_REVIEW', approve: 'APPROVED', issue: 'ISSUED', acknowledge: 'ACKNOWLEDGED', 'request-changes': 'CHANGES_REQUESTED' };
    const timestamp = new Date().toISOString();
    const status = statusByAction[action] ?? current.status;
    const document: RndDocumentDetail = { ...current, status, updatedAt: timestamp, approvals: [...current.approvals, { action, actor: request.actor, comment: request.comment, createdAt: timestamp }] };
    this.writeMockDocuments(documents.map((item) => item.uuid === id ? document : item));
    return of(document).pipe(delay(120));
  }

  private readMockDocuments(): RndDocumentDetail[] {
    try { return JSON.parse(globalThis.localStorage?.getItem(this.mockStorageKey) || '[]'); } catch { return []; }
  }

  private writeMockDocuments(documents: RndDocumentDetail[]): void {
    try { globalThis.localStorage?.setItem(this.mockStorageKey, JSON.stringify(documents)); } catch { /* Storage can be unavailable during SSR. */ }
  }
}
