export type QmsStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'RELEASED' | 'ARCHIVED';

export type QmsDocumentType =
  | 'NEW_PRODUCT_NOTICE'
  | 'PRODUCT_SPECIFICATION'
  | 'CHANGE_PROPOSAL'
  | 'PRODUCT_CHANGE_NOTIFICATION'
  | 'ENGINEERING_CHANGE_REQUEST'
  | 'ENGINEERING_CHANGE_NOTICE'
  | 'RAW_MATERIAL_STANDARD'
  | 'SEMI_FINISHED_STANDARD'
  | 'FINISHED_PRODUCT_STANDARD'
  | 'RECEIPT_TRACKING';

export type QmsFieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox-group' | 'specification';

export interface BilingualLabel {
  en: string;
  vi: string;
  zh: string;
}

export interface QmsFieldDefinition {
  key: string;
  label: BilingualLabel;
  type: QmsFieldType;
  required?: boolean;
  options?: string[];
  section?: string;
}

export interface QmsDocumentDefinition {
  type: QmsDocumentType;
  formNumber: string;
  name: BilingualLabel;
  category: 'product' | 'change' | 'standard' | 'tracking';
  fields: QmsFieldDefinition[];
  approvals: string[];
}

export interface ApprovalStep {
  role: string;
  approver: string;
  decision: 'WAITING' | 'APPROVED' | 'REJECTED';
  date?: string;
  comment?: string;
}

export interface AuditEntry {
  at: string;
  actor: string;
  action: string;
}

export interface QmsDocument {
  id: string;
  documentNumber: string;
  type: QmsDocumentType;
  productCode: string;
  productName: string;
  status: QmsStatus;
  createdAt: string;
  updatedAt: string;
  values: Record<string, unknown>;
  approvals: ApprovalStep[];
  auditTrail: AuditEntry[];
}

export interface QmsFilters {
  search: string;
  type: QmsDocumentType | '';
  status: QmsStatus | '';
  from: string;
  to: string;
}

const label = (en: string, vi: string, zh: string): BilingualLabel => ({ en, vi, zh });
const field = (key: string, en: string, vi: string, zh: string, type: QmsFieldType = 'text', required = false, section = 'General', options?: string[]): QmsFieldDefinition =>
  ({ key, label: label(en, vi, zh), type, required, section, options });
const specs = (keys: string[], section = 'Quality specifications') => keys.map((key) => field(key.toLowerCase().replace(/[^a-z0-9]+/g, ''), key, key, key, 'specification', false, section));

const productBase = [
  field('vnProductCode', 'VN product code', 'Ma san pham VN', '越南產品代碼', 'text', true),
  field('taiwanProductCode', 'Taiwan product code', 'Ma san pham Dai Loan', '台灣產品代碼'),
  field('productName', 'Product name', 'Ten san pham', '產品名稱', 'text', true),
  field('packaging', 'Packaging', 'Bao bi', '包裝'),
  field('storageCondition', 'Storage condition', 'Dieu kien bao quan', '儲存條件'),
  field('shelfLife', 'Shelf life', 'Han su dung', '保存期限'),
  field('weight', 'Weight', 'Trong luong', '重量', 'number'),
];

const approval = {
  product: ['Prepared by', 'Technical manager', 'Department manager'],
  change: ['Prepared by', 'Unit manager', 'QA & Production manager', 'Technical manager', 'Executive vice president', 'General manager'],
  standard: ['Prepared by', 'QA manager', 'Technical manager', 'General manager'],
};

export const QMS_DOCUMENT_DEFINITIONS: QmsDocumentDefinition[] = [
  {
    type: 'NEW_PRODUCT_NOTICE', formNumber: 'P-RS1 001-01.02', category: 'product',
    name: label('New Product Manufacturing Notice', 'Thong bao che bien san pham moi', '新產品製造通知單'),
    fields: [...productBase, ...specs(['Brix', 'Acid', 'pH', 'AN', 'Solid', 'CPS', 'Ash', 'Brix/Acid ratio', 'TPC', 'Yeast/Mold', 'Coliform', 'E.coli']),
      field('rawMaterials', 'Raw materials', 'Nguyen lieu', '原料', 'textarea', true, 'Formula & process'),
      field('additives', 'Additives', 'Phu gia', '添加劑', 'textarea', false, 'Formula & process'),
      field('formula', 'Formula', 'Cong thuc', '配方', 'textarea', true, 'Formula & process'),
      field('process', 'Process', 'Quy trinh', '製程', 'textarea', true, 'Formula & process'),
      field('notes', 'Notes', 'Ghi chu', '備註', 'textarea', false, 'Formula & process'),
      field('createdBy', 'Created by', 'Nguoi lap', '建立者', 'text', true, 'Approval')], approvals: approval.product,
  },
  {
    type: 'PRODUCT_SPECIFICATION', formNumber: 'P-RS1 001-03.02', category: 'product',
    name: label('New Product Specification Sheet', 'Phieu quy cach san pham moi', '新產品規格表'),
    fields: [...productBase, ...['Brix', 'Acid', 'pH', 'AN', 'Solid', 'Ash', 'TPC', 'Yeast/Mold', 'Coliform'].flatMap((key) => [
      field(`customer${key.replace(/[^a-z0-9]/gi, '')}`, `${key} - customer specification`, `${key} - quy cach khach hang`, `${key}－客戶規格`, 'text', false, 'Specification comparison'),
      field(`internal${key.replace(/[^a-z0-9]/gi, '')}`, `${key} - internal specification`, `${key} - quy cach noi bo`, `${key}－內部規格`, 'text', false, 'Specification comparison'),
    ])], approvals: approval.product,
  },
  {
    type: 'CHANGE_PROPOSAL', formNumber: 'QMS-CC-01', category: 'change', name: label('Process / Formula / Specification Change Proposal', 'De nghi thay doi quy trinh / cong thuc / quy cach', '製程／配方／規格變更提案'),
    fields: [field('productCode', 'Product code', 'Ma san pham', '產品代碼', 'text', true), field('changeType', 'Change type', 'Loai thay doi', '變更類型', 'select', true, 'General', ['Specification', 'Formula', 'Process']), field('currentStandard', 'Current standard', 'Tieu chuan hien tai', '現行標準', 'textarea', true), field('proposedChange', 'Proposed change', 'Thay doi de xuat', '建議變更', 'textarea', true), field('changeReason', 'Change reason', 'Ly do thay doi', '變更原因', 'textarea', true), field('effectiveDate', 'Effective date', 'Ngay hieu luc', '生效日期', 'date', true), field('notes', 'Notes', 'Ghi chu', '備註', 'textarea')], approvals: approval.change,
  },
  {
    type: 'PRODUCT_CHANGE_NOTIFICATION', formNumber: 'QMS-CC-02', category: 'change', name: label('Product Change Notification', 'Thong bao thay doi san pham', '產品變更通知'),
    fields: [field('productCode', 'Product code', 'Ma san pham', '產品代碼', 'text', true), field('changeCategory', 'Change category', 'Hang muc thay doi', '變更類別', 'text', true), field('beforeChange', 'Before change', 'Truoc thay doi', '變更前', 'textarea', true), field('afterChange', 'After change', 'Sau thay doi', '變更後', 'textarea', true), field('notes', 'Notes', 'Ghi chu', '備註', 'textarea')], approvals: approval.change,
  },
  {
    type: 'ENGINEERING_CHANGE_REQUEST', formNumber: 'QMS-ECR-01', category: 'change', name: label('Engineering Change Request', 'Yeu cau thay doi ky thuat', '工程變更申請'),
    fields: [field('documentNumber', 'Document number', 'So tai lieu', '文件編號', 'text', true), field('notificationDate', 'Notification date', 'Ngay thong bao', '通知日期', 'date', true), field('receivedDate', 'Received date', 'Ngay nhan', '收件日期', 'date'), field('productCode', 'Product code', 'Ma san pham', '產品代碼', 'text', true), field('urgency', 'Urgency', 'Muc do khan', '緊急程度', 'select', true, 'General', ['Urgent', 'Normal']), field('importance', 'Importance', 'Muc do quan trong', '重要性', 'select', true, 'General', ['A', 'B']), field('packaging', 'Packaging', 'Bao bi', '包裝'), field('quantity', 'Quantity', 'So luong', '數量', 'number'), field('annualQuantity', 'Estimated annual quantity', 'San luong nam du kien', '預估年量', 'number'), field('referenceCost', 'Reference cost', 'Chi phi tham khao', '參考成本', 'number'), field('completionDate', 'Completion date', 'Ngay hoan thanh', '完成日期', 'date'), ...specs(['Brix', 'Acid', 'pH']), field('reasons', 'Reasons', 'Ly do', '原因', 'checkbox-group', true, 'Analysis', ['Raw material shortage', 'Purchase price increase', 'New customer order', 'Customer forecast insufficient', 'Seasonal production shortage', 'Semi-finished product shortage', 'Inventory consumption', 'Raw material out of specification', 'Other']), field('existingAnalysis', 'Existing product/material analysis', 'Phan tich san pham/nguyen lieu hien co', '現有產品／物料分析', 'textarea', false, 'Analysis'), field('recommendation', 'Recommended raw material/semi-finished product', 'Nguyen lieu/ban thanh pham de nghi', '建議原料／半成品', 'textarea', false, 'Analysis'), field('results', 'Required results', 'Ket qua yeu cau', '要求結果', 'checkbox-group', false, 'Results', ['Review', 'Trial production', 'Component analysis table', 'BOM creation', 'Limit sample creation', 'QC engineering diagram', 'Production operation standard', 'Experimental process notice', 'Trial-to-production notice']), field('remarks', 'Remarks', 'Ghi chu', '備註', 'textarea', false, 'Results')], approvals: approval.change,
  },
  {
    type: 'ENGINEERING_CHANGE_NOTICE', formNumber: 'QMS-ECN-01', category: 'change', name: label('Engineering Change Notice', 'Thong bao thay doi ky thuat', '工程變更通知'),
    fields: [field('productName', 'Product name', 'Ten san pham', '產品名稱', 'text', true), field('changeItem', 'Change item', 'Hang muc thay doi', '變更項目', 'text', true), field('beforeChange', 'Before change', 'Truoc thay doi', '變更前', 'textarea', true), field('afterChange', 'After change', 'Sau thay doi', '變更後', 'textarea', true), field('process', 'Process', 'Quy trinh', '製程', 'textarea'), field('implementationDate', 'Expected implementation date', 'Ngay du kien ap dung', '預計實施日期', 'date', true), field('changeMethod', 'Change method', 'Phuong phap thay doi', '變更方式', 'select', true, 'General', ['Normal', 'Stage', 'Temporary']), field('changeFactors', 'Change factors', 'Yeu to thay doi', '變更因素', 'checkbox-group', true, 'General', ['Safety', 'Raw material', 'Additive', 'Customer requirement', 'Inventory handling', 'Specification/process change', 'Other']), field('limitSamples', 'Limit sample', 'Mau gioi han', '限度樣品', 'checkbox-group', false, 'Samples', ['Semi-finished product', 'Before sterilization', 'Finished product'])], approvals: approval.change,
  },
  {
    type: 'RAW_MATERIAL_STANDARD', formNumber: 'QMS-RM-01', category: 'standard', name: label('Raw Material Acceptance Standard', 'Tieu chuan nghiem thu nguyen lieu', '原料驗收標準'),
    fields: [field('version', 'Version', 'Phien ban', '版本', 'text', true), field('date', 'Date', 'Ngay', '日期', 'date', true), field('rawMaterialName', 'Raw material name', 'Ten nguyen lieu', '原料名稱', 'text', true), field('materialType', 'Material type', 'Loai nguyen lieu', '物料類型', 'text', true), field('materialCode', 'Material code', 'Ma nguyen lieu', '物料代碼', 'text', true), field('incomingSpecification', 'Incoming specification', 'Quy cach dau vao', '進料規格', 'textarea', true), field('usageSpecification', 'Usage specification', 'Quy cach su dung', '使用規格', 'textarea', true), ...specs(['Pb <= 2.00 mg/kg', 'Cu <= 30.00 mg/kg', 'Mn = 0 mg/kg', 'Zn <= 40.00 mg/kg', 'As <= 1.00 mg/kg'], 'Heavy metal limits'), field('pesticideResidue', 'Pesticide residue', 'Du luong thuoc BVTV', '農藥殘留', 'select', true, 'Inspection', ['Not allowed']), field('inspectionMethod', 'Inspection method', 'Phuong phap kiem tra', '檢驗方法', 'textarea', true, 'Inspection'), field('remarks', 'Remarks', 'Ghi chu', '備註', 'textarea', false, 'Inspection')], approvals: approval.standard,
  },
  {
    type: 'SEMI_FINISHED_STANDARD', formNumber: 'QMS-SF-01', category: 'standard', name: label('Semi-Finished Product Acceptance Standard', 'Tieu chuan nghiem thu ban thanh pham', '半成品驗收標準'),
    fields: [field('version', 'Version', 'Phien ban', '版本', 'text', true), field('date', 'Date', 'Ngay', '日期', 'date', true), field('productName', 'Semi-finished product', 'Ban thanh pham', '半成品名稱', 'text', true), field('origin', 'Origin', 'Nguon goc', '來源', 'select', true, 'General', ['Domestic semi-finished product', 'Imported semi-finished product']), field('productCode', 'Product code', 'Ma san pham', '產品代碼', 'text', true), field('incomingSpecification', 'Incoming specification', 'Quy cach dau vao', '進料規格', 'textarea', true), field('usageSpecification', 'Usage specification', 'Quy cach su dung', '使用規格', 'textarea', true), field('inspectionMethod', 'Inspection method', 'Phuong phap kiem tra', '檢驗方法', 'textarea', true), field('remarks', 'Remarks', 'Ghi chu', '備註', 'textarea')], approvals: approval.standard,
  },
  {
    type: 'FINISHED_PRODUCT_STANDARD', formNumber: 'P-RS1 001-02.02', category: 'standard', name: label('Finished Product Acceptance Specification', 'Quy cach nghiem thu thanh pham', '成品允收規格表'),
    fields: [field('productCode', 'Product code', 'Ma san pham', '產品代碼', 'text', true), field('productName', 'Product name', 'Ten san pham', '產品名稱', 'text', true), ...specs(['Brix', 'Acid', 'pH', 'AN', 'Solid', 'Brix/Acid ratio', 'Ash', 'CPS', 'Impurities', 'TPC', 'Yeast/Mold', 'Coliform']), field('storageCondition', 'Storage condition', 'Dieu kien bao quan', '儲存條件', 'text', true), field('shelfLife', 'Shelf life', 'Han su dung', '保存期限', 'text', true), field('weightPackaging', 'Weight / Packaging', 'Trong luong / Bao bi', '重量／包裝', 'text', true)], approvals: approval.standard,
  },
  {
    type: 'RECEIPT_TRACKING', formNumber: 'QMS-DOC-01', category: 'tracking', name: label('Controlled Document Receipt Tracking', 'Theo doi giao nhan tai lieu kiem soat', '受控文件收發追蹤'),
    fields: [field('productCode', 'Product code', 'Ma san pham', '產品代碼', 'text', true), field('productName', 'Product / material name', 'Ten san pham / nguyen lieu', '產品／物料名稱', 'text', true), field('createdDate', 'Created date', 'Ngay lap', '建立日期', 'date', true), field('deliveredDate', 'Delivered date', 'Ngay giao', '交付日期', 'date'), field('receiver', 'Receiver', 'Nguoi nhan', '收件人'), field('returnDate', 'Return date', 'Ngay tra', '歸還日期', 'date'), field('deliveredBy', 'Delivered by', 'Nguoi giao', '交付人'), field('remarks', 'Remarks', 'Ghi chu', '備註', 'textarea'), field('documentType', 'Document type', 'Loai tai lieu', '文件類型', 'select', true, 'General', ['New Product Manufacturing Notice', 'New Product Specification Sheet', 'Product Change Notification', 'Semi-Finished Product Acceptance Standard'])], approvals: [],
  },
];

export const QMS_STATUSES: QmsStatus[] = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'RELEASED', 'ARCHIVED'];
export const definitionFor = (type: QmsDocumentType) => QMS_DOCUMENT_DEFINITIONS.find((item) => item.type === type)!;
