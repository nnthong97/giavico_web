import { CommonModule, DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { RndDocumentDetail, RndDocumentStatus, RndDocumentTemplate, RndTemplateField } from '../models/rnd-document.model';
import { AppLanguage, LanguageService } from '../../../core/i18n/language.service';
import { RndDocumentService } from '../data-access/rnd-document.service';
import { RndDocumentHeaderComponent } from '../ui/rnd-document-header.component';

interface WorkflowAction { key: string; labelKey: string; nextStatus: RndDocumentStatus; }

@Component({
  selector: 'app-rnd-document-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, RndDocumentHeaderComponent],
  template: `
    <div class="document-app"><app-rnd-document-header />
      <main class="document-page narrow">
        <a routerLink="/documents" class="back-link">← {{ t('backToDocuments') }}</a>
        <div *ngIf="loading()" class="state-message">{{ t('loadingDocument') }}</div>
        <div *ngIf="error()" class="state-message error"><strong>{{ t('documentUnavailable') }}</strong><span>{{ error() }}</span></div>

        <ng-container *ngIf="document() as item">
          <div class="detail-title-row">
            <div><span class="eyebrow">{{ item.documentNumber }}</span><h1>{{ item.title }}</h1><p>{{ typeLabel(item.type) }} · {{ t('revision') }} R{{ item.revision }}</p></div>
            <div class="title-actions"><a *ngIf="canEdit(item.status)" [routerLink]="['/documents', item.uuid, 'edit']" class="button secondary">{{ t('editDocument') }}</a><span class="status large" [attr.data-status]="item.status">{{ statusLabel(item.status) }}</span></div>
          </div>

          <section class="detail-summary">
            <div><span>{{ t('productName') }}</span><strong>{{ item.productName }}</strong></div>
            <div><span>{{ t('market') }}</span><strong>{{ item.market }}</strong></div>
            <div><span>{{ t('owner') }}</span><strong>{{ item.owner }}</strong></div>
            <div><span>{{ t('updated') }}</span><strong>{{ item.updatedAt | date:'medium' }}</strong></div>
            <div *ngIf="item.formulaUuid"><span>{{ t('linkedFormula') }}</span><a [routerLink]="['/formulas', item.formulaUuid]">{{ item.formulaUuid }}</a></div>
          </section>

          <section class="form-section printable">
            <div class="section-heading"><div><span class="eyebrow">{{ templateFormNumber() }}</span><h2>{{ typeLabel(item.type) }}</h2></div><button type="button" class="button secondary" (click)="print()">{{ t('printPdf') }}</button></div>
            <dl class="field-review">
              <div *ngFor="let field of templateFields()" [class.table-review]="field.type === 'table'"><dt>{{ fieldLabel(field) }}</dt><dd *ngIf="field.type !== 'table'">{{ displayValue(item.fieldValues[field.key]) }}</dd><dd *ngIf="field.type === 'table'" class="review-table-scroll"><table><thead><tr><th *ngFor="let column of field.columns">{{ fieldLabel(column) }}</th></tr></thead><tbody><tr *ngFor="let row of tableValue(item.fieldValues[field.key])"><td *ngFor="let column of field.columns">{{ displayValue(row[column.key]) }}</td></tr></tbody></table><span *ngIf="!tableValue(item.fieldValues[field.key]).length">—</span></dd></div>
            </dl>
          </section>

          <section *ngIf="actions().length" class="workflow-panel">
            <div><h2>{{ t('workflowActions') }}</h2><p>{{ t('workflowHint') }}</p></div>
            <div class="workflow-actions"><ng-container *ngFor="let action of actions()"><ng-container *ngIf="action.key === 'approve' && remainingApprovalRoles().length; else genericAction"><button *ngFor="let role of remainingApprovalRoles()" type="button" class="button primary" [disabled]="transitioning()" (click)="runAction(action, role.en)">{{ t(action.labelKey) }} - {{ localizedText(role) }}</button></ng-container><ng-template #genericAction><button type="button" class="button" [class.primary]="action.key !== 'request-changes'" [class.danger]="action.key === 'request-changes'" [disabled]="transitioning()" (click)="runAction(action)">{{ t(action.labelKey) }}</button></ng-template></ng-container></div>
          </section>
          <div *ngIf="workflowError()" class="inline-error">{{ workflowError() }}</div>

          <div class="history-grid">
            <section class="form-section"><h2>{{ t('approvalHistory') }}</h2><ol class="timeline"><li *ngFor="let approval of item.approvals"><span></span><div><strong>{{ approval.role || approval.action }}</strong><p>{{ approval.comment || t('noComment') }}</p><small>{{ approval.actor }} · {{ approval.createdAt | date:'medium' }}</small></div></li><li *ngIf="!item.approvals.length" class="empty-history">{{ t('noApprovals') }}</li></ol></section>
            <section class="form-section"><h2>{{ t('revisionHistory') }}</h2><ol class="timeline"><li *ngFor="let revision of item.revisions"><span></span><div><strong>R{{ revision.revision }} · {{ statusLabel(revision.status) }}</strong><p>{{ revision.changeSummary }}</p><small>{{ revision.changedBy }} · {{ revision.createdAt | date:'medium' }}</small></div></li></ol></section>
          </div>
        </ng-container>
      </main>
    </div>
  `,
  styleUrls: ['../styles/rnd-documents.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RndDocumentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(RndDocumentService);
  private readonly language = inject(LanguageService);
  private readonly browserDocument = inject(DOCUMENT);
  public readonly document = signal<RndDocumentDetail | null>(null);
  public readonly template = signal<RndDocumentTemplate | null>(null);
  public readonly loading = signal(false);
  public readonly error = signal('');
  public readonly workflowError = signal('');
  public readonly transitioning = signal(false);
  private readonly actionMap: Partial<Record<RndDocumentStatus, WorkflowAction[]>> = {
    DRAFT: [{ key: 'submit', labelKey: 'submitForReview', nextStatus: 'SUBMITTED' }],
    CHANGES_REQUESTED: [{ key: 'submit', labelKey: 'resubmit', nextStatus: 'SUBMITTED' }],
    SUBMITTED: [{ key: 'start-review', labelKey: 'startReview', nextStatus: 'UNDER_REVIEW' }],
    UNDER_REVIEW: [{ key: 'approve', labelKey: 'approve', nextStatus: 'APPROVED' }, { key: 'request-changes', labelKey: 'requestChanges', nextStatus: 'CHANGES_REQUESTED' }],
    APPROVED: [{ key: 'issue', labelKey: 'issueDocument', nextStatus: 'ISSUED' }],
    ISSUED: [{ key: 'acknowledge', labelKey: 'acknowledge', nextStatus: 'ACKNOWLEDGED' }],
  };

  public ngOnInit(): void { this.load(); }
  public load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error.set(this.t('documentUnavailable')); return; }
    this.loading.set(true); this.error.set('');
    this.service.get(id).pipe(
      switchMap((item) => forkJoin({ item: of(item), template: this.service.getTemplate(item.type) })),
      finalize(() => this.loading.set(false))
    ).subscribe({ next: ({ item, template }) => { this.document.set(item); this.template.set(template); }, error: (error) => this.error.set(error?.error?.message ?? error?.message ?? this.t('unknownError')) });
  }
  public actions(): WorkflowAction[] { const item = this.document(); return item ? this.actionMap[item.status] ?? [] : []; }
  public runAction(action: WorkflowAction, role?: string): void {
    const item = this.document(); if (!item) return;
    const comment = this.browserDocument.defaultView?.prompt(this.t('workflowCommentPrompt')) ?? '';
    if (action.key === 'request-changes' && !comment.trim()) { this.workflowError.set(this.t('commentRequired')); return; }
    this.transitioning.set(true); this.workflowError.set('');
    this.service.transition(item.uuid, action.key, { actor: 'R&D User', comment: comment.trim(), role }).pipe(finalize(() => this.transitioning.set(false))).subscribe({ next: (updated) => this.document.set(updated), error: (error) => this.workflowError.set(error?.error?.message ?? error?.message ?? this.t('unknownError')) });
  }
  public print(): void {
    const item = this.document();
    if (!item) return;
    this.browserDocument.defaultView?.open(this.service.pdfUrl(item.uuid), '_blank', 'noopener');
  }
  public canEdit(status: RndDocumentStatus): boolean { return status === 'DRAFT' || status === 'CHANGES_REQUESTED'; }
  public remainingApprovalRoles(): import('../models/rnd-document.model').RndLocalizedText[] {
    const item = this.document(); const template = this.template(); if (!item || !template) return [];
    const approved = new Set(item.approvals.filter((approval) => approval.action === 'approve' && approval.revision === item.revision).map((approval) => approval.role));
    return template.approvals.filter((role) => !approved.has(role.en));
  }
  public localizedText(value: import('../models/rnd-document.model').RndLocalizedText): string { return this.language.language() === 'vi' ? value.vi : this.language.language() === 'zh-TW' ? value.zhTw : value.en; }
  public templateFields(): RndTemplateField[] { return this.template()?.fields ?? []; }
  public templateFormNumber(): string { return this.template()?.formNumber ?? ''; }
  public fieldLabel(field: RndTemplateField): string { const lang: AppLanguage = this.language.language(); return lang === 'vi' ? field.labelVi : lang === 'zh-TW' ? field.labelZhTw : field.label; }
  public tableValue(value: unknown): Record<string, unknown>[] { return Array.isArray(value) ? value as Record<string, unknown>[] : []; }
  public displayValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (Array.isArray(value)) return value.length ? value.map((item) => this.displayValue(item)).join(', ') : '—';
    if (typeof value === 'object') return Object.entries(value).filter(([, item]) => item !== '').map(([key, item]) => `${key}: ${this.displayValue(item)}`).join(', ') || '—';
    return String(value);
  }
  public t(key: string): string { return this.language.translate(key); }
  public statusLabel(value: string): string { return this.t(`documentStatus.${value}`); }
  public typeLabel(value: string): string { const template = this.template(); return template?.type === value ? (this.language.language() === 'vi' ? template.nameVi : this.language.language() === 'zh-TW' ? template.nameZhTw : template.name) : this.t(`documentType.${value}`); }
}
