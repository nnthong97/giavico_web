import { RndDocumentStatus, RndDocumentType } from '../../rnd-documents/models/rnd-document.model';

export type ProcessRunStatus = 'ACTIVE' | 'BLOCKED' | 'COMPLETED';
export type ProcessStepStatus = 'pending' | 'active' | 'done' | 'blocked';

export interface ProcessDocumentRecord {
  documentId: string;
  templateType?: RndDocumentType;
  uuid?: string;
  documentNumber?: string;
  status?: RndDocumentStatus;
  title: string;
  productName: string;
  market: string;
  owner: string;
  effectiveDate?: string | null;
  fieldValues: Record<string, unknown>;
  updatedAt: string;
}

export interface ProcessActivityEvent {
  id: number;
  title: string;
  detail: string;
  createdAt: string;
}

export interface ProcessRunDetail {
  uuid: string;
  workflowId: string;
  title: string;
  owner: string;
  currentStepId: string;
  status: ProcessRunStatus;
  stepStatuses: Record<string, ProcessStepStatus>;
  stepData: Record<string, Record<string, unknown>>;
  documentRecords: Record<string, ProcessDocumentRecord>;
  activityLog: ProcessActivityEvent[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export type ProcessRunSaveRequest = Omit<
  ProcessRunDetail,
  'uuid' | 'createdAt' | 'updatedAt' | 'completedAt'
>;
