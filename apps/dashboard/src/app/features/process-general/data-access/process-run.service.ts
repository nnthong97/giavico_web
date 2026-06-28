import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, delay, of, throwError } from 'rxjs';
import { GIAVICO_API_DOMAINS } from '../../../core/config/giavico-api-domains';
import {
  ProcessRunDetail,
  ProcessRunSaveRequest,
} from '../models/process-run.model';

@Injectable({ providedIn: 'root' })
export class ProcessRunService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = GIAVICO_API_DOMAINS.processRuns;
  private readonly mockStorageKey = 'giavico.process-runs.mock.v1';

  public latestOpen(workflowId: string): Observable<ProcessRunDetail> {
    const params = new HttpParams().set('workflowId', workflowId);
    return this.http.get<ProcessRunDetail>(`${this.apiUrl}/latest`, { params }).pipe(
      catchError((error) => this.canUseFallback(error)
        ? this.mockLatestOpen(workflowId)
        : throwError(() => error))
    );
  }

  public create(request: ProcessRunSaveRequest): Observable<ProcessRunDetail> {
    return this.http.post<ProcessRunDetail>(this.apiUrl, request).pipe(
      catchError((error) => this.canUseFallback(error)
        ? this.mockCreate(request)
        : throwError(() => error))
    );
  }

  public update(id: string, request: ProcessRunSaveRequest): Observable<ProcessRunDetail> {
    return this.http.put<ProcessRunDetail>(`${this.apiUrl}/${id}`, request).pipe(
      catchError((error) => this.canUseFallback(error)
        ? this.mockUpdate(id, request, false)
        : throwError(() => error))
    );
  }

  public complete(id: string, request: ProcessRunSaveRequest): Observable<ProcessRunDetail> {
    return this.http.post<ProcessRunDetail>(`${this.apiUrl}/${id}/complete`, request).pipe(
      catchError((error) => this.canUseFallback(error)
        ? this.mockUpdate(id, request, true)
        : throwError(() => error))
    );
  }

  private canUseFallback(error: { status?: number }): boolean {
    return error?.status === 0 || error?.status === 404;
  }

  private mockLatestOpen(workflowId: string): Observable<ProcessRunDetail> {
    const run = this.readMockRuns().find((item) =>
      item.workflowId === workflowId && item.status !== 'COMPLETED');
    return run
      ? of(run).pipe(delay(80))
      : throwError(() => new ProcessRunNotFoundError(workflowId));
  }

  private mockCreate(request: ProcessRunSaveRequest): Observable<ProcessRunDetail> {
    const runs = this.readMockRuns();
    const timestamp = new Date().toISOString();
    const run: ProcessRunDetail = {
      ...request,
      uuid: globalThis.crypto?.randomUUID?.() ?? `process-${Date.now()}`,
      status: request.status === 'COMPLETED' ? 'ACTIVE' : request.status,
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: null,
    };
    this.writeMockRuns([run, ...runs]);
    return of(run).pipe(delay(100));
  }

  private mockUpdate(
    id: string,
    request: ProcessRunSaveRequest,
    complete: boolean
  ): Observable<ProcessRunDetail> {
    const runs = this.readMockRuns();
    const current = runs.find((item) => item.uuid === id);
    if (!current) return throwError(() => new Error('Process run not found in mock storage'));
    if (current.status === 'COMPLETED') {
      return throwError(() => new Error('Completed process runs are immutable'));
    }
    const timestamp = new Date().toISOString();
    const run: ProcessRunDetail = {
      ...current,
      ...request,
      status: complete ? 'COMPLETED' : request.status,
      updatedAt: timestamp,
      completedAt: complete ? timestamp : null,
    };
    this.writeMockRuns(runs.map((item) => item.uuid === id ? run : item));
    return of(run).pipe(delay(100));
  }

  private readMockRuns(): ProcessRunDetail[] {
    try {
      return JSON.parse(globalThis.localStorage?.getItem(this.mockStorageKey) || '[]');
    } catch {
      return [];
    }
  }

  private writeMockRuns(runs: ProcessRunDetail[]): void {
    try {
      globalThis.localStorage?.setItem(this.mockStorageKey, JSON.stringify(runs));
    } catch {
      // Storage can be unavailable during SSR.
    }
  }
}

export class ProcessRunNotFoundError extends Error {
  public constructor(workflowId: string) {
    super(`No active process run found for workflow: ${workflowId}`);
  }
}
