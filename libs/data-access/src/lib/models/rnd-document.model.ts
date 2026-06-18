export type RndDocumentStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'ISSUED'
  | 'ACKNOWLEDGED'
  | 'SUPERSEDED';

export type RndDocumentType =
  | 'SAMPLE_REPORT'
  | 'MANUFACTURING_NOTICE'
  | 'PRODUCT_SPECIFICATION'
  | 'FINISHED_PRODUCT_ACCEPTANCE';

export interface RndTemplateField {
  key: string;
  label: string;
  labelVi: string;
  labelZhTw: string;
  type: 'text' | 'textarea' | 'date' | 'number';
  required?: boolean;
}

export interface RndDocumentTemplate {
  type: RndDocumentType;
  formNumber: string;
  name: string;
  nameVi: string;
  nameZhTw: string;
  fields: RndTemplateField[];
}

export interface RndDocumentSummary {
  uuid: string;
  documentNumber: string;
  type: RndDocumentType;
  title: string;
  productName: string;
  formulaUuid?: string | null;
  status: RndDocumentStatus;
  revision: number;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export interface RndApprovalRecord {
  action: string;
  actor: string;
  comment: string;
  createdAt: string;
}

export interface RndRevisionRecord {
  revision: number;
  status: RndDocumentStatus;
  changedBy: string;
  changeSummary: string;
  createdAt: string;
}

export interface RndDocumentDetail extends RndDocumentSummary {
  market: string;
  effectiveDate?: string | null;
  fieldValues: Record<string, string | number>;
  approvals: RndApprovalRecord[];
  revisions: RndRevisionRecord[];
}

export interface RndDocumentSaveRequest {
  type: RndDocumentType;
  title: string;
  productName: string;
  formulaUuid?: string | null;
  market: string;
  owner: string;
  effectiveDate?: string | null;
  fieldValues: Record<string, string | number>;
}

export interface RndWorkflowRequest {
  actor: string;
  comment: string;
}
