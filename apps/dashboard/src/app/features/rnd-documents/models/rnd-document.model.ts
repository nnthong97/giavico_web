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
  | 'ENGINEERING_CHANGE_NOTICE'
  | 'CHANGE_PROPOSAL'
  | 'ENGINEERING_CHANGE_REQUEST'
  | 'SEMI_FINISHED_STANDARD_RECEIPT'
  | 'PRODUCT_SPECIFICATION_RECEIPT'
  | 'PRODUCT_CHANGE_NOTICE_RECEIPT'
  | 'MANUFACTURING_NOTICE_RECEIPT'
  | 'PRODUCT_CHANGE_NOTIFICATION'
  | 'MANUFACTURING_NOTICE'
  | 'PRODUCT_SPECIFICATION'
  | 'FINISHED_PRODUCT_ACCEPTANCE'
  | 'SEMI_FINISHED_ACCEPTANCE'
  | 'RAW_MATERIAL_ACCEPTANCE'
  | 'PRODUCT_CONFIRMATION';

export type RndTemplateFieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'number'
  | 'select'
  | 'checkbox-group'
  | 'table'
  | 'specification'
  | 'comparison'
  | 'notice';

export interface RndTemplateField {
  key: string;
  label: string;
  labelVi: string;
  labelZhTw: string;
  type: RndTemplateFieldType;
  required?: boolean;
  section?: string;
  options?: RndLocalizedText[];
  columns?: RndTemplateField[];
}

export interface RndLocalizedText {
  en: string;
  vi: string;
  zhTw: string;
}

export interface RndDocumentTemplate {
  type: RndDocumentType;
  formNumber: string;
  name: string;
  nameVi: string;
  nameZhTw: string;
  fields: RndTemplateField[];
  approvals: RndLocalizedText[];
  sourceAvailable: boolean;
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
  role?: string | null;
  revision?: number | null;
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
  fieldValues: Record<string, unknown>;
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
  fieldValues: Record<string, unknown>;
}

export interface RndWorkflowRequest {
  actor: string;
  comment: string;
  role?: string;
}
