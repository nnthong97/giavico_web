import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { RND_DOCUMENT_TEMPLATES } from '../data/rnd-document-templates';
import { RndDocumentSaveRequest, RndDocumentTemplate, RndDocumentType } from '../models/rnd-document.model';
import { AppLanguage, LanguageService } from '../services/language.service';
import { RndDocumentService } from '../services/rnd-document.service';
import { RndDocumentHeaderComponent } from './rnd-document-header.component';

@Component({
  selector: 'giavico-rnd-document-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RndDocumentHeaderComponent],
  template: `
    <div class="document-app"><giavico-rnd-document-header />
      <main class="document-page narrow">
        <a routerLink="/documents" class="back-link">← {{ t('backToDocuments') }}</a>
        <div class="page-title-row"><div><span class="eyebrow">{{ selectedTemplate().formNumber }}</span><h1>{{ documentId ? t('editDocument') : t('newDocument') }}</h1><p>{{ templateName(selectedTemplate()) }}</p></div></div>
        <form class="document-form" #documentForm="ngForm" (ngSubmit)="save(documentForm)">
          <section class="form-section">
            <h2>{{ t('documentInformation') }}</h2>
            <div class="form-grid">
              <label><span>{{ t('documentType') }} *</span><select name="type" [(ngModel)]="model.type" (change)="changeTemplate(model.type)" required><option *ngFor="let template of templates" [value]="template.type">{{ templateName(template) }}</option></select></label>
              <label><span>{{ t('title') }} *</span><input name="title" [(ngModel)]="model.title" required /></label>
              <label><span>{{ t('productName') }} *</span><input name="productName" [(ngModel)]="model.productName" required /></label>
              <label><span>{{ t('market') }} *</span><input name="market" [(ngModel)]="model.market" required /></label>
              <label><span>{{ t('formulaUuid') }}</span><input name="formulaUuid" [(ngModel)]="model.formulaUuid" /></label>
              <label><span>{{ t('owner') }} *</span><input name="owner" [(ngModel)]="model.owner" required /></label>
              <label><span>{{ t('effectiveDate') }}</span><input name="effectiveDate" type="date" [(ngModel)]="model.effectiveDate" /></label>
            </div>
          </section>
          <section class="form-section">
            <h2>{{ templateName(selectedTemplate()) }}</h2>
            <div class="form-grid">
              <label *ngFor="let field of selectedTemplate().fields" [class.full]="field.type === 'textarea'">
                <span>{{ fieldLabel(field) }} <ng-container *ngIf="field.required">*</ng-container></span>
                <textarea *ngIf="field.type === 'textarea'" [name]="field.key" [(ngModel)]="model.fieldValues[field.key]" [required]="field.required || false" rows="4"></textarea>
                <input *ngIf="field.type !== 'textarea'" [name]="field.key" [type]="field.type" [(ngModel)]="model.fieldValues[field.key]" [required]="field.required || false" />
              </label>
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
  styleUrls: ['./rnd-documents.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RndDocumentEditorComponent implements OnInit {
  private readonly service = inject(RndDocumentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);
  public readonly templates = RND_DOCUMENT_TEMPLATES;
  public readonly selectedTemplate = signal<RndDocumentTemplate>(this.templates[0]);
  public readonly saving = signal(false);
  public readonly validationError = signal(false);
  public readonly error = signal('');
  public documentId: string | null = null;
  public model: RndDocumentSaveRequest = { type: 'SAMPLE_REPORT', title: '', productName: '', formulaUuid: '', market: '', owner: 'R&D User', effectiveDate: '', fieldValues: {} };

  public ngOnInit(): void {
    this.documentId = this.route.snapshot.paramMap.get('id');
    if (this.documentId) {
      this.service.get(this.documentId).subscribe({
        next: (document) => {
          this.model = { type: document.type, title: document.title, productName: document.productName, formulaUuid: document.formulaUuid, market: document.market, owner: document.owner, effectiveDate: document.effectiveDate, fieldValues: { ...document.fieldValues } };
          this.selectedTemplate.set(this.templates.find((item) => item.type === document.type) ?? this.templates[0]);
        },
        error: (error) => this.error.set(error?.error?.message ?? error?.message ?? this.t('unknownError')),
      });
      return;
    }
    const formulaUuid = this.route.snapshot.queryParamMap.get('formulaUuid');
    const productName = this.route.snapshot.queryParamMap.get('productName');
    if (formulaUuid) this.model.formulaUuid = formulaUuid;
    if (productName) { this.model.productName = productName; this.model.title = `${productName} - ${this.templateName(this.selectedTemplate())}`; }
  }

  public changeTemplate(type: RndDocumentType): void {
    const template = this.templates.find((item) => item.type === type) ?? this.templates[0];
    this.selectedTemplate.set(template);
    this.model.fieldValues = {};
    if (this.model.productName) this.model.title = `${this.model.productName} - ${this.templateName(template)}`;
  }

  public save(form: NgForm): void {
    if (form.invalid) {
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
      error: (error) => this.error.set(error?.error?.message ?? error?.message ?? this.t('unknownError')),
    });
  }

  public t(key: string): string { return this.language.translate(key); }
  public templateName(template: RndDocumentTemplate): string { return this.language.language() === 'vi' ? template.nameVi : this.language.language() === 'zh-TW' ? template.nameZhTw : template.name; }
  public fieldLabel(field: RndDocumentTemplate['fields'][number]): string { const lang: AppLanguage = this.language.language(); return lang === 'vi' ? field.labelVi : lang === 'zh-TW' ? field.labelZhTw : field.label; }
}
