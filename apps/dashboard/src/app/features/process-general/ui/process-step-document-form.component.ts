import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AppLanguage, LanguageService } from '../../../core/i18n/language.service';
import { RndDocumentService } from '../../rnd-documents/data-access/rnd-document.service';
import { RND_DOCUMENT_TEMPLATES } from '../../rnd-documents/data/rnd-document-templates';
import {
  RndDocumentSaveRequest,
  RndDocumentTemplate,
  RndDocumentType,
  RndLocalizedText,
  RndTemplateField,
  RndTemplateFieldType,
} from '../../rnd-documents/models/rnd-document.model';
import { ProcessDocumentRecord } from '../models/process-run.model';

@Component({
  selector: 'app-process-step-document-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <article class="process-document">
      <div class="document-summary">
        <span class="doc-kind">{{ templateType ? 'FORM' : kind }}</span>
        <div>
          <strong>{{ displayName }}</strong>
          <small *ngIf="record?.uuid; else unsaved">
            {{ record?.documentNumber }} · {{ record?.status }}
          </small>
          <ng-template #unsaved><small>{{ copy('Not saved', 'Chưa lưu', '尚未儲存') }}</small></ng-template>
        </div>
        <a *ngIf="record?.uuid" [routerLink]="['/documents', record?.uuid]" class="document-link">
          {{ copy('Open', 'Mở', '開啟') }}
        </a>
        <button type="button" class="toggle" (click)="openModal()">
          {{ copy('Fill document', 'Điền tài liệu', '填寫文件') }}
        </button>
      </div>
    </article>

    <div
      *ngIf="expanded()"
      class="document-modal-backdrop"
      role="presentation"
      (click)="closeModal()"
      (keydown.escape)="closeModal()"
    >
      <section
        class="document-modal"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="displayName"
        tabindex="-1"
        (click)="$event.stopPropagation()"
      >
        <header class="modal-header">
          <div>
            <span class="doc-kind">{{ templateType ? 'FORM' : kind }}</span>
            <h4>{{ displayName }}</h4>
            <small *ngIf="record?.uuid; else draftStatus">
              {{ record?.documentNumber }} · {{ record?.status }}
            </small>
            <ng-template #draftStatus>
              <small>{{ copy('Draft document', 'Tài liệu nháp', '草稿文件') }}</small>
            </ng-template>
          </div>
          <button type="button" class="close-modal" (click)="closeModal()" [attr.aria-label]="copy('Close', 'Đóng', '關閉')">×</button>
        </header>

        <form #documentForm="ngForm" (ngSubmit)="save(documentForm)" class="document-form">
          <div class="document-metadata">
            <label><span>{{ copy('Title', 'Tiêu đề', '標題') }} *</span><input name="title-{{ documentId }}" [(ngModel)]="model.title" required /></label>
            <label><span>{{ copy('Product name', 'Tên sản phẩm', '產品名稱') }} *</span><input name="product-{{ documentId }}" [(ngModel)]="model.productName" required /></label>
            <label><span>{{ copy('Market', 'Thị trường', '市場') }} *</span><input name="market-{{ documentId }}" [(ngModel)]="model.market" required /></label>
            <label><span>{{ copy('Owner', 'Phụ trách', '負責人') }} *</span><input name="owner-{{ documentId }}" [(ngModel)]="model.owner" required /></label>
            <label><span>{{ copy('Effective date', 'Ngày hiệu lực', '生效日期') }}</span><input name="date-{{ documentId }}" type="date" [(ngModel)]="model.effectiveDate" /></label>
          </div>

          <ng-container *ngIf="template(); else genericFields">
            <div *ngFor="let section of templateSections()" class="template-section">
              <h5>{{ sectionLabel(section) }}</h5>
              <div class="field-grid">
                <ng-container *ngFor="let field of fieldsForSection(section)">
                  <div *ngIf="field.type === 'table'" class="table-field full">
                    <div class="field-head"><span>{{ fieldLabel(field) }} <b *ngIf="field.required">*</b></span><button type="button" (click)="addTableRow(field)">{{ copy('Add row', 'Thêm dòng', '新增列') }}</button></div>
                    <div class="table-scroll"><table><thead><tr><th *ngFor="let column of field.columns">{{ fieldLabel(column) }}</th><th></th></tr></thead><tbody><tr *ngFor="let row of tableRows(field.key); let rowIndex = index"><td *ngFor="let column of field.columns"><input [name]="documentId + '-' + field.key + '-' + rowIndex + '-' + column.key" [type]="inputType(column.type)" [ngModel]="row[column.key]" (ngModelChange)="row[column.key] = $event" /></td><td><button type="button" class="remove" (click)="removeTableRow(field.key, rowIndex)">×</button></td></tr></tbody></table></div>
                  </div>
                  <fieldset *ngIf="field.type === 'checkbox-group'" class="full"><legend>{{ fieldLabel(field) }}</legend><label *ngFor="let option of field.options" class="option"><input type="checkbox" [checked]="isOptionSelected(field.key, option.en)" (change)="toggleOption(field.key, option.en, $any($event.target).checked)" /> {{ optionLabel(option) }}</label></fieldset>
                  <label *ngIf="field.type === 'select'"><span>{{ fieldLabel(field) }} <b *ngIf="field.required">*</b></span><select [name]="documentId + '-' + field.key" [(ngModel)]="model.fieldValues[field.key]" [required]="field.required || false"><option value="">{{ copy('Select', 'Chọn', '選擇') }}</option><option *ngFor="let option of field.options" [value]="option.en">{{ optionLabel(option) }}</option></select></label>
                  <div *ngIf="field.type === 'notice'" class="notice full">{{ fieldLabel(field) }}</div>
                  <label *ngIf="isBasicField(field)" [class.full]="field.type === 'textarea'"><span>{{ fieldLabel(field) }} <b *ngIf="field.required">*</b></span><textarea *ngIf="field.type === 'textarea'" [name]="documentId + '-' + field.key" [(ngModel)]="model.fieldValues[field.key]" [required]="field.required || false" rows="4"></textarea><input *ngIf="field.type !== 'textarea'" [name]="documentId + '-' + field.key" [type]="inputType(field.type)" [(ngModel)]="model.fieldValues[field.key]" [required]="field.required || false" /></label>
                </ng-container>
              </div>
            </div>
          </ng-container>

          <ng-template #genericFields>
            <div class="field-grid generic-fields">
              <label><span>{{ copy('Reference', 'Tham chiếu', '參考編號') }}</span><input name="reference-{{ documentId }}" [(ngModel)]="model.fieldValues['reference']" /></label>
              <label><span>{{ copy('Decision / result', 'Quyết định / kết quả', '決定／結果') }}</span><input name="result-{{ documentId }}" [(ngModel)]="model.fieldValues['result']" /></label>
              <label class="full"><span>{{ copy('Document details', 'Nội dung tài liệu', '文件內容') }} *</span><textarea name="details-{{ documentId }}" [(ngModel)]="model.fieldValues['details']" rows="5" required></textarea></label>
            </div>
          </ng-template>

          <p *ngIf="validationError()" class="error">{{ copy('Complete all required fields.', 'Vui lòng điền đủ các trường bắt buộc.', '請填寫所有必填欄位。') }}</p>
          <p *ngIf="error()" class="error">{{ error() }}</p>
          <div class="form-actions">
            <button type="button" class="secondary" (click)="closeModal()" [disabled]="saving()">{{ copy('Cancel', 'Hủy', '取消') }}</button>
            <button type="submit" [disabled]="saving() || loading()">{{ saving() ? copy('Saving…', 'Đang lưu…', '儲存中…') : copy('Save document', 'Lưu tài liệu', '儲存文件') }}</button>
          </div>
        </form>
      </section>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .process-document { background: #fbfdff; border: 1px solid #dbe4ef; border-radius: 10px; overflow: hidden; }
    .document-summary { align-items: center; display: grid; gap: 10px; grid-template-columns: auto minmax(0, 1fr) auto auto; padding: 12px; }
    .document-summary strong { color: #17233b; }
    .document-summary strong, .document-summary small { display: block; overflow-wrap: break-word; }
    .document-summary small { color: #64748b; margin-top: 3px; }
    .doc-kind { background: #e8eff8; border-radius: 6px; color: #1766c2; font-size: .68rem; font-weight: 800; padding: 6px; }
    button, .document-link { background: #0f8d91; border: 1px solid #18a7ab; border-radius: 6px; color: #fff; cursor: pointer; font: inherit; font-size: .76rem; font-weight: 700; padding: 7px 10px; text-decoration: none; }
    .toggle { background: transparent; border-color: #9badc4; color: #34465e; }
    .document-modal-backdrop { align-items: center; background: rgba(15, 23, 42, .58); display: flex; inset: 0; justify-content: center; padding: 24px; position: fixed; z-index: 1000; }
    .document-modal { background: #fff; border: 1px solid #dbe4ef; border-radius: 10px; box-shadow: 0 28px 80px rgba(15, 23, 42, .28); color: #17233b; max-height: min(86vh, 920px); max-width: 980px; overflow: hidden; width: min(100%, 980px); }
    .modal-header { align-items: flex-start; border-bottom: 1px solid #dbe4ef; display: flex; gap: 16px; justify-content: space-between; padding: 16px 18px; }
    .modal-header h4 { color: #102f67; font-size: 1rem; margin: 8px 0 3px; }
    .modal-header small { color: #64748b; display: block; }
    .close-modal { align-items: center; background: #f1f5f9; border-color: #cbd5e1; color: #334155; display: inline-flex; font-size: 1.1rem; height: 32px; justify-content: center; line-height: 1; padding: 0; width: 32px; }
    .document-form { max-height: calc(min(86vh, 920px) - 84px); overflow-y: auto; padding: 16px 18px 18px; }
    .document-metadata, .field-grid { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    label > span, legend { color: #526179; display: block; font-size: .73rem; font-weight: 700; margin-bottom: 5px; }
    input, select, textarea { background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; color: #17233b; font: inherit; padding: 8px; width: 100%; }
    textarea { resize: vertical; }
    .template-section { border-top: 1px solid #dbe4ef; margin-top: 15px; padding-top: 12px; }
    h5 { color: #102f67; margin: 0 0 10px; }
    .full { grid-column: 1 / -1; }
    fieldset { border: 1px solid #cbd5e1; border-radius: 7px; }
    .option { color: #34465e; display: inline-flex; gap: 5px; margin: 4px 14px 4px 0; }
    .option input { width: auto; }
    .field-head { align-items: center; display: flex; justify-content: space-between; margin-bottom: 8px; }
    .field-head span { color: #526179; font-size: .73rem; font-weight: 700; }
    .table-scroll { overflow-x: auto; }
    table { border-collapse: collapse; min-width: 680px; width: 100%; }
    th, td { border: 1px solid #dbe4ef; padding: 5px; }
    th { color: #526179; font-size: .7rem; text-align: left; }
    .remove { background: transparent; border-color: #7f1d1d; color: #fca5a5; }
    .notice { background: #eef4fb; border-radius: 7px; color: #526179; padding: 10px; }
    .generic-fields { margin-top: 14px; }
    .form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 14px; }
    .form-actions .secondary { background: #e8eff8; border-color: #d4deeb; color: #34465e; }
    .error { color: #fca5a5; font-size: .78rem; }
    :host-context(.dark-theme) .process-document, :host-context(.dark-theme) .document-modal, :host-context(.dark-theme) input, :host-context(.dark-theme) select, :host-context(.dark-theme) textarea { background: #111c2e; border-color: #334155; color: #e2e8f0; }
    :host-context(.dark-theme) .modal-header, :host-context(.dark-theme) .template-section, :host-context(.dark-theme) th, :host-context(.dark-theme) td { border-color: #334155; }
    :host-context(.dark-theme) .document-summary strong, :host-context(.dark-theme) .modal-header h4, :host-context(.dark-theme) h5 { color: #e2e8f0; }
    :host-context(.dark-theme) .document-summary small, :host-context(.dark-theme) .modal-header small, :host-context(.dark-theme) label > span, :host-context(.dark-theme) legend, :host-context(.dark-theme) .field-head span, :host-context(.dark-theme) th { color: #94a3b8; }
    :host-context(.dark-theme) .option { color: #cbd5e1; }
    :host-context(.dark-theme) .toggle { border-color: #475569; color: #cbd5e1; }
    :host-context(.dark-theme) .close-modal, :host-context(.dark-theme) .form-actions .secondary { background: #1e293b; border-color: #475569; color: #cbd5e1; }
    @media (max-width: 720px) { .document-summary { grid-template-columns: auto minmax(0, 1fr); } .document-modal-backdrop { align-items: stretch; padding: 12px; } .document-modal { max-height: calc(100vh - 24px); width: 100%; } .document-form { max-height: calc(100vh - 108px); } .document-metadata, .field-grid { grid-template-columns: 1fr; } .full { grid-column: auto; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcessStepDocumentFormComponent implements OnChanges {
  private readonly documents = inject(RndDocumentService);
  private readonly language = inject(LanguageService);

  @Input({ required: true }) public documentId = '';
  @Input({ required: true }) public displayName = '';
  @Input() public kind = 'Record';
  @Input() public templateType?: RndDocumentType;
  @Input() public record?: ProcessDocumentRecord;
  @Input() public defaultProductName = 'Yuzu Black Tea';
  @Input() public defaultMarket = 'APAC - Japan';
  @Input() public defaultOwner = 'R&D User';
  @Output() public readonly recordSaved = new EventEmitter<ProcessDocumentRecord>();

  public readonly expanded = signal(false);
  public readonly template = signal<RndDocumentTemplate | null>(null);
  public readonly loading = signal(false);
  public readonly saving = signal(false);
  public readonly validationError = signal(false);
  public readonly error = signal('');
  public model: RndDocumentSaveRequest = this.createModel();

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['record'] || changes['documentId'] || changes['templateType']) {
      this.model = this.createModel();
    }
    if (changes['templateType'] || changes['documentId']) this.loadTemplate();
  }

  public openModal(): void {
    this.validationError.set(false);
    this.error.set('');
    this.expanded.set(true);
  }

  public closeModal(): void {
    if (this.saving()) return;
    this.expanded.set(false);
  }

  public save(form: NgForm): void {
    if (form.invalid || this.hasMissingRequiredField()) {
      form.control.markAllAsTouched();
      this.validationError.set(true);
      return;
    }
    this.validationError.set(false);
    this.error.set('');
    const timestamp = new Date().toISOString();
    if (!this.templateType) {
      this.recordSaved.emit({
        documentId: this.documentId,
        title: this.model.title,
        productName: this.model.productName,
        market: this.model.market,
        owner: this.model.owner,
        effectiveDate: this.model.effectiveDate,
        fieldValues: { ...this.model.fieldValues },
        updatedAt: timestamp,
      });
      this.expanded.set(false);
      return;
    }

    this.saving.set(true);
    const request: RndDocumentSaveRequest = {
      ...this.model,
      type: this.templateType,
      formulaUuid: this.model.formulaUuid?.trim() || null,
      effectiveDate: this.model.effectiveDate || null,
    };
    const operation = this.record?.uuid
      ? this.documents.update(this.record.uuid, request)
      : this.documents.create(request);
    operation.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (document) => {
        this.recordSaved.emit({
          documentId: this.documentId,
          templateType: this.templateType,
          uuid: document.uuid,
          documentNumber: document.documentNumber,
          status: document.status,
          title: document.title,
          productName: document.productName,
          market: document.market,
          owner: document.owner,
          effectiveDate: document.effectiveDate,
          fieldValues: { ...document.fieldValues },
          updatedAt: document.updatedAt,
        });
        this.expanded.set(false);
      },
      error: (error) => this.error.set(this.errorMessage(error)),
    });
  }

  public copy(en: string, vi: string, zh: string): string {
    const current: AppLanguage = this.language.language();
    return current === 'vi' ? vi : current === 'zh-TW' ? zh : en;
  }

  public fieldLabel(field: RndTemplateField): string { return this.copy(field.label, field.labelVi, field.labelZhTw); }
  public optionLabel(option: RndLocalizedText): string { return this.copy(option.en, option.vi, option.zhTw); }
  public templateSections(): string[] { return [...new Set((this.template()?.fields ?? []).map((field) => field.section || 'general'))]; }
  public fieldsForSection(section: string): RndTemplateField[] { return (this.template()?.fields ?? []).filter((field) => (field.section || 'general') === section); }
  public sectionLabel(section: string): string {
    const labels: Record<string, RndLocalizedText> = {
      general: { en: 'General information', vi: 'Thông tin chung', zhTw: '一般資訊' },
      specification: { en: 'Specifications', vi: 'Quy cách', zhTw: '規格' },
      process: { en: 'Process details', vi: 'Chi tiết quy trình', zhTw: '製程詳情' },
      shipping: { en: 'Shipping', vi: 'Vận chuyển', zhTw: '寄送' },
      approval: { en: 'Approval', vi: 'Phê duyệt', zhTw: '核准' },
      tracking: { en: 'Tracking', vi: 'Theo dõi', zhTw: '追蹤' },
    };
    return this.optionLabel(labels[section] ?? { en: section, vi: section, zhTw: section });
  }
  public isBasicField(field: RndTemplateField): boolean { return ['text', 'textarea', 'date', 'number', 'specification', 'comparison'].includes(field.type); }
  public inputType(type: RndTemplateFieldType): string { return type === 'date' || type === 'number' ? type : 'text'; }
  public tableRows(key: string): Record<string, unknown>[] { return Array.isArray(this.model.fieldValues[key]) ? this.model.fieldValues[key] as Record<string, unknown>[] : []; }
  public addTableRow(field: RndTemplateField): void { this.model.fieldValues[field.key] = [...this.tableRows(field.key), this.emptyTableRow(field)]; }
  public removeTableRow(key: string, index: number): void { this.model.fieldValues[key] = this.tableRows(key).filter((_, rowIndex) => rowIndex !== index); }
  public isOptionSelected(key: string, value: string): boolean { return Array.isArray(this.model.fieldValues[key]) && (this.model.fieldValues[key] as unknown[]).includes(value); }
  public toggleOption(key: string, value: string, selected: boolean): void {
    const values = Array.isArray(this.model.fieldValues[key]) ? [...this.model.fieldValues[key] as string[]] : [];
    this.model.fieldValues[key] = selected ? [...values, value] : values.filter((item) => item !== value);
  }

  private createModel(): RndDocumentSaveRequest {
    return {
      type: this.templateType ?? 'SAMPLE_REPORT',
      title: this.record?.title ?? this.displayName,
      productName: this.record?.productName ?? this.defaultProductName,
      formulaUuid: null,
      market: this.record?.market ?? this.defaultMarket,
      owner: this.record?.owner ?? this.defaultOwner,
      effectiveDate: this.record?.effectiveDate ?? '',
      fieldValues: { ...(this.record?.fieldValues ?? {}) },
    };
  }

  private loadTemplate(): void {
    if (!this.templateType) {
      this.template.set(null);
      return;
    }
    this.loading.set(true);
    this.documents.getTemplate(this.templateType).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (template) => { this.template.set(template); this.prepareFieldValues(template); },
      error: (error) => {
        const fallback = RND_DOCUMENT_TEMPLATES.find((item) => item.type === this.templateType) ?? null;
        this.template.set(fallback);
        if (fallback) this.prepareFieldValues(fallback);
        else this.error.set(this.errorMessage(error));
      },
    });
  }

  private prepareFieldValues(template: RndDocumentTemplate): void {
    for (const field of template.fields) {
      if (this.model.fieldValues[field.key] !== undefined) continue;
      if (field.type === 'checkbox-group') this.model.fieldValues[field.key] = [];
      else if (field.type === 'table') this.model.fieldValues[field.key] = [this.emptyTableRow(field)];
      else this.model.fieldValues[field.key] = '';
    }
  }

  private emptyTableRow(field: RndTemplateField): Record<string, unknown> {
    return Object.fromEntries((field.columns ?? []).map((column) => [column.key, '']));
  }
  private hasMissingRequiredField(): boolean {
    return (this.template()?.fields ?? []).some((field) => field.required && !this.hasValue(this.model.fieldValues[field.key]));
  }
  private hasValue(value: unknown): boolean {
    if (typeof value === 'string') return Boolean(value.trim());
    if (Array.isArray(value)) return value.some((item) => this.hasValue(item));
    if (value && typeof value === 'object') return Object.values(value).some((item) => this.hasValue(item));
    return value !== null && value !== undefined;
  }
  private errorMessage(error: unknown): string {
    const response = error as { error?: { message?: string }; message?: string } | null;
    return response?.error?.message ?? response?.message ?? this.copy('Unable to save document.', 'Không thể lưu tài liệu.', '無法儲存文件。');
  }
}
