import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { RND_DOCUMENT_TEMPLATES } from '../data/rnd-document-templates';
import { RndDocumentSaveRequest, RndDocumentTemplate, RndDocumentType, RndLocalizedText, RndTemplateField, RndTemplateFieldType } from '../models/rnd-document.model';
import { AppLanguage, LanguageService } from '../../../core/i18n/language.service';
import { RndDocumentService } from '../data-access/rnd-document.service';
import { RndDocumentHeaderComponent } from '../ui/rnd-document-header.component';

@Component({
  selector: 'app-rnd-document-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RndDocumentHeaderComponent],
  template: `
    <div class="document-app"><app-rnd-document-header />
      <main class="document-page narrow">
        <a routerLink="/documents" class="back-link">← {{ t('backToDocuments') }}</a>
        <div class="page-title-row"><div><span class="eyebrow">{{ selectedTemplate().formNumber }}</span><h1>{{ documentId ? t('editDocument') : t('newDocument') }}</h1><p>{{ templateName(selectedTemplate()) }}</p></div></div>
        <form class="document-form" #documentForm="ngForm" (ngSubmit)="save(documentForm)">
          <section class="form-section">
            <h2>{{ t('documentInformation') }}</h2>
            <div class="form-grid">
              <label><span>{{ t('documentType') }} *</span><select name="type" [(ngModel)]="model.type" (change)="changeTemplate(model.type)" [disabled]="loadingTemplates()" required><option *ngFor="let template of templates()" [value]="template.type">{{ templateName(template) }}</option></select></label>
              <label><span>{{ t('title') }} *</span><input name="title" [(ngModel)]="model.title" required /></label>
              <label><span>{{ t('productName') }} *</span><input name="productName" [(ngModel)]="model.productName" required /></label>
              <label><span>{{ t('market') }} *</span><input name="market" [(ngModel)]="model.market" required /></label>
              <label><span>{{ t('formulaUuid') }}</span><input name="formulaUuid" [(ngModel)]="model.formulaUuid" /></label>
              <label><span>{{ t('owner') }} *</span><input name="owner" [(ngModel)]="model.owner" required /></label>
              <label><span>{{ t('effectiveDate') }}</span><input name="effectiveDate" type="date" [(ngModel)]="model.effectiveDate" /></label>
            </div>
          </section>
          <section class="form-section">
            <div class="section-heading"><h2>{{ templateName(selectedTemplate()) }}</h2><a *ngIf="templateSourceUrl()" class="source-link" [href]="templateSourceUrl()" target="_blank" rel="noopener">View source PDF</a></div>
            <div *ngFor="let section of templateSections()" class="template-subsection">
              <h3>{{ sectionLabel(section) }}</h3>
              <div class="form-grid">
                <ng-container *ngFor="let field of fieldsForSection(section)">
                  <div *ngIf="field.type === 'table'" class="template-field template-table full">
                    <div class="template-field-head"><span>{{ fieldLabel(field) }} <ng-container *ngIf="field.required">*</ng-container></span><button type="button" class="table-action" (click)="addTableRow(field)">Add row</button></div>
                    <div class="table-editor-scroll"><table><thead><tr><th *ngFor="let column of field.columns">{{ fieldLabel(column) }}</th><th class="row-actions"><span class="sr-only">Actions</span></th></tr></thead><tbody><tr *ngFor="let row of tableRows(field.key); let rowIndex = index; trackBy: trackIndex"><td *ngFor="let column of field.columns"><input [name]="field.key + '-' + rowIndex + '-' + column.key" [type]="inputType(column.type)" [ngModel]="row[column.key]" (ngModelChange)="row[column.key] = $event" /></td><td class="row-actions"><button type="button" class="remove-row" (click)="removeTableRow(field.key, rowIndex)" aria-label="Remove row">×</button></td></tr></tbody></table></div>
                    <div *ngIf="!tableRows(field.key).length" class="empty-table">No rows yet. Select Add row to enter data.</div>
                  </div>
                  <fieldset *ngIf="field.type === 'checkbox-group'" class="template-field option-field full"><legend>{{ fieldLabel(field) }} <ng-container *ngIf="field.required">*</ng-container></legend><label *ngFor="let option of field.options" class="option-item"><input type="checkbox" [checked]="isOptionSelected(field.key, option.en)" (change)="toggleOption(field.key, option.en, $any($event.target).checked)" /><span>{{ optionLabel(option) }}</span></label></fieldset>
                  <label *ngIf="field.type === 'select'" class="template-field"><span>{{ fieldLabel(field) }} <ng-container *ngIf="field.required">*</ng-container></span><select [name]="field.key" [(ngModel)]="model.fieldValues[field.key]" [required]="field.required || false"><option value="">Select an option</option><option *ngFor="let option of field.options" [value]="option.en">{{ optionLabel(option) }}</option></select></label>
                  <div *ngIf="field.type === 'notice'" class="template-notice full">{{ fieldLabel(field) }}</div>
                  <label *ngIf="isBasicField(field)" class="template-field" [class.full]="field.type === 'textarea'"><span>{{ fieldLabel(field) }} <ng-container *ngIf="field.required">*</ng-container></span><textarea *ngIf="field.type === 'textarea'" [name]="field.key" [(ngModel)]="model.fieldValues[field.key]" [required]="field.required || false" rows="4"></textarea><input *ngIf="field.type !== 'textarea'" [name]="field.key" [type]="inputType(field.type)" [(ngModel)]="model.fieldValues[field.key]" [required]="field.required || false" /></label>
                </ng-container>
              </div>
            </div>
          </section>
          <div *ngIf="validationError()" class="inline-error">Complete all required fields marked with * before saving.</div>
          <div *ngIf="error()" class="inline-error">{{ error() }}</div>
          <div class="form-actions">
            <a [routerLink]="documentId ? ['/documents', documentId] : ['/documents']" class="button secondary">
              {{ t('cancel') }}
            </a>
            <button class="button primary" type="submit" [disabled]="saving()" [class.saving]="saving()" [attr.aria-busy]="saving()">
              {{ saving() ? t('saving') : (documentId ? t('updateDraft') : t('saveDraft')) }}
            </button></div>
        </form>
      </main>
    </div>
  `,
  styleUrls: ['../styles/rnd-documents.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RndDocumentEditorComponent implements OnInit, OnDestroy {
  private readonly service = inject(RndDocumentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);
  public readonly templates = signal<RndDocumentTemplate[]>(RND_DOCUMENT_TEMPLATES);
  public readonly selectedTemplate = signal<RndDocumentTemplate>(RND_DOCUMENT_TEMPLATES[0]);
  public readonly templateSource = signal<Blob | null>(null);
  public readonly templateSourceUrl = signal('');
  public readonly loadingTemplates = signal(true);
  public readonly saving = signal(false);
  public readonly validationError = signal(false);
  public readonly error = signal('');
  public documentId: string | null = null;
  public model: RndDocumentSaveRequest = { type: 'SAMPLE_REPORT', title: '', productName: '', formulaUuid: '', market: '', owner: 'R&D User', effectiveDate: '', fieldValues: {} };

  public ngOnInit(): void {
    this.documentId = this.route.snapshot.paramMap.get('id');
    this.service.listTemplates().subscribe({
      next: (templates) => {
        if (templates.length) {
          this.templates.set(templates);
          if (!this.documentId && !templates.some((item) => item.type === this.model.type)) this.model.type = templates[0].type;
        }
        this.initializeDocument();
      },
      error: (error) => {
        this.error.set(this.errorMessage(error));
        this.initializeDocument();
      },
    });
  }

  public ngOnDestroy(): void {
    this.releaseTemplateSourceUrl();
  }

  private initializeDocument(): void {
    if (this.documentId) {
      this.service.get(this.documentId).subscribe({
        next: (document) => {
          this.model = { type: document.type, title: document.title, productName: document.productName, formulaUuid: document.formulaUuid, market: document.market, owner: document.owner, effectiveDate: document.effectiveDate, fieldValues: { ...document.fieldValues } };
          this.loadTemplate(document.type, false);
        },
        error: (error) => {
          this.loadingTemplates.set(false);
          this.error.set(this.errorMessage(error));
        },
      });
      return;
    }
    const formulaUuid = this.route.snapshot.queryParamMap.get('formulaUuid');
    const productName = this.route.snapshot.queryParamMap.get('productName');
    if (formulaUuid) this.model.formulaUuid = formulaUuid;
    if (productName) this.model.productName = productName;
    this.loadTemplate(this.model.type, false);
  }

  public changeTemplate(type: RndDocumentType): void {
    this.loadTemplate(type, true);
  }

  private loadTemplate(type: RndDocumentType, resetFieldValues: boolean): void {
    this.loadingTemplates.set(true);
    forkJoin({ template: this.service.getTemplate(type), source: this.service.getTemplateSource(type) })
      .pipe(finalize(() => this.loadingTemplates.set(false)))
      .subscribe({
        next: ({ template, source }) => {
          this.error.set('');
          this.selectedTemplate.set(template);
          this.templateSource.set(source);
          if (resetFieldValues) this.model.fieldValues = {};
          this.prepareFieldValues(template);
          this.setTemplateSourceUrl(source);
          if (this.model.productName && (!this.documentId || resetFieldValues)) this.model.title = `${this.model.productName} - ${this.templateName(template)}`;
        },
        error: (error) => this.error.set(this.errorMessage(error)),
      });
  }

  public save(form: NgForm): void {
    if (form.invalid || this.hasMissingRequiredTemplateField()) {
      form.control.markAllAsTouched();
      this.validationError.set(true);
      return;
    }
    this.validationError.set(false);
    this.saving.set(true); this.error.set('');
    const request = { ...this.model, formulaUuid: this.model.formulaUuid?.trim() || null, effectiveDate: this.model.effectiveDate || null };
    const operation = this.documentId ? this.service.update(this.documentId, request) : this.service.create(request);
    operation.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (document) => this.router.navigate(['/documents', document.uuid]),
      error: (error) => this.error.set(this.errorMessage(error)),
    });
  }

  public t(key: string): string { return this.language.translate(key); }
  public templateName(template: RndDocumentTemplate): string { return this.language.language() === 'vi' ? template.nameVi : this.language.language() === 'zh-TW' ? template.nameZhTw : template.name; }
  public fieldLabel(field: RndTemplateField): string { const lang: AppLanguage = this.language.language(); return lang === 'vi' ? field.labelVi : lang === 'zh-TW' ? field.labelZhTw : field.label; }
  public optionLabel(option: RndLocalizedText): string { const lang: AppLanguage = this.language.language(); return lang === 'vi' ? option.vi : lang === 'zh-TW' ? option.zhTw : option.en; }
  public templateSections(): string[] { return [...new Set(this.selectedTemplate().fields.map((field) => field.section || 'general'))]; }
  public fieldsForSection(section: string): RndTemplateField[] { return this.selectedTemplate().fields.filter((field) => (field.section || 'general') === section); }
  public sectionLabel(section: string): string {
    const labels: Record<string, RndLocalizedText> = {
      general: { en: 'General information', vi: 'Thông tin chung', zhTw: '一般資訊' },
      specification: { en: 'Specifications', vi: 'Quy cách', zhTw: '規格' },
      process: { en: 'Process details', vi: 'Chi tiết quy trình', zhTw: '製程詳情' },
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
  public trackIndex(index: number): number { return index; }
  public isOptionSelected(key: string, value: string): boolean { return Array.isArray(this.model.fieldValues[key]) && (this.model.fieldValues[key] as unknown[]).includes(value); }
  public toggleOption(key: string, value: string, selected: boolean): void {
    const values = Array.isArray(this.model.fieldValues[key]) ? [...this.model.fieldValues[key] as string[]] : [];
    this.model.fieldValues[key] = selected ? [...values, value] : values.filter((item) => item !== value);
  }

  private prepareFieldValues(template: RndDocumentTemplate): void {
    for (const field of template.fields) {
      if (this.model.fieldValues[field.key] !== undefined) continue;
      if (field.type === 'checkbox-group') this.model.fieldValues[field.key] = [];
      else if (field.type === 'table') this.model.fieldValues[field.key] = this.initialTableRows(template, field);
      else this.model.fieldValues[field.key] = '';
    }
  }

  private initialTableRows(template: RndDocumentTemplate, field: RndTemplateField): Record<string, unknown>[] {
    if (template.type === 'SAMPLE_REPORT' && field.key === 'processMeasurements') {
      const items = ['°Brix', 'Acid (%)', 'pH', 'AN', 'Solid (%)', 'Ratio', 'Ash (%)', 'CPS', 'ABS', 'T%', 'Color card', 'TPC(cfu/ml)', 'Y&M(cfu/ml)', 'Weight(kg)', 'Yield (%)'];
      return items.map((item) => ({ ...this.emptyTableRow(field), item }));
    }
    return [this.emptyTableRow(field)];
  }

  private emptyTableRow(field: RndTemplateField): Record<string, unknown> { return Object.fromEntries((field.columns ?? []).map((column) => [column.key, ''])); }
  private hasMissingRequiredTemplateField(): boolean {
    return this.selectedTemplate().fields.some((field) => field.required && !this.hasValue(this.model.fieldValues[field.key]));
  }
  private hasValue(value: unknown): boolean {
    if (typeof value === 'string') return Boolean(value.trim());
    if (Array.isArray(value)) return value.some((item) => this.hasValue(item));
    if (value && typeof value === 'object') return Object.values(value).some((item) => this.hasValue(item));
    return value !== null && value !== undefined;
  }
  private setTemplateSourceUrl(source: Blob | null): void {
    this.releaseTemplateSourceUrl();
    if (source && globalThis.URL?.createObjectURL) this.templateSourceUrl.set(globalThis.URL.createObjectURL(source));
  }
  private releaseTemplateSourceUrl(): void {
    const url = this.templateSourceUrl();
    if (url && globalThis.URL?.revokeObjectURL) globalThis.URL.revokeObjectURL(url);
    this.templateSourceUrl.set('');
  }
  private errorMessage(error: unknown): string {
    const response = error as { error?: { message?: string }; message?: string } | null;
    return response?.error?.message ?? response?.message ?? this.t('unknownError');
  }
}
