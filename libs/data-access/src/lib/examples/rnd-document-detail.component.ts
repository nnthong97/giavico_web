import { CommonModule, DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { RND_DOCUMENT_TEMPLATES } from '../data/rnd-document-templates';
import { RndDocumentDetail, RndDocumentStatus, RndTemplateField } from '../models/rnd-document.model';
import { AppLanguage, LanguageService } from '../services/language.service';
import { RndDocumentService } from '../services/rnd-document.service';
import { RndDocumentHeaderComponent } from './rnd-document-header.component';

interface WorkflowAction { key: string; labelKey: string; nextStatus: RndDocumentStatus; }

@Component({
  selector: 'giavico-rnd-document-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, RndDocumentHeaderComponent],
  template: `
    <div class="document-app"><giavico-rnd-document-header />
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
              <div *ngFor="let field of templateFields()"><dt>{{ fieldLabel(field) }}</dt><dd>{{ item.fieldValues[field.key] || '—' }}</dd></div>
            </dl>
          </section>

          <section *ngIf="actions().length" class="workflow-panel">
            <div><h2>{{ t('workflowActions') }}</h2><p>{{ t('workflowHint') }}</p></div>
            <div class="workflow-actions"><button *ngFor="let action of actions()" type="button" class="button" [class.primary]="action.key !== 'request-changes'" [class.danger]="action.key === 'request-changes'" [disabled]="transitioning()" (click)="runAction(action)">{{ t(action.labelKey) }}</button></div>
          </section>
          <div *ngIf="workflowError()" class="inline-error">{{ workflowError() }}</div>

          <div class="history-grid">
            <section class="form-section"><h2>{{ t('approvalHistory') }}</h2><ol class="timeline"><li *ngFor="let approval of item.approvals"><span></span><div><strong>{{ approval.action }}</strong><p>{{ approval.comment || t('noComment') }}</p><small>{{ approval.actor }} · {{ approval.createdAt | date:'medium' }}</small></div></li><li *ngIf="!item.approvals.length" class="empty-history">{{ t('noApprovals') }}</li></ol></section>
            <section class="form-section"><h2>{{ t('revisionHistory') }}</h2><ol class="timeline"><li *ngFor="let revision of item.revisions"><span></span><div><strong>R{{ revision.revision }} · {{ statusLabel(revision.status) }}</strong><p>{{ revision.changeSummary }}</p><small>{{ revision.changedBy }} · {{ revision.createdAt | date:'medium' }}</small></div></li></ol></section>
          </div>
        </ng-container>
      </main>
    </div>
  `,
  styleUrls: ['./rnd-documents.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RndDocumentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(RndDocumentService);
  private readonly language = inject(LanguageService);
  private readonly browserDocument = inject(DOCUMENT);
  public readonly document = signal<RndDocumentDetail | null>(null);
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
    this.service.get(id).pipe(finalize(() => this.loading.set(false))).subscribe({ next: (item) => this.document.set(item), error: (error) => this.error.set(error?.error?.message ?? error?.message ?? this.t('unknownError')) });
  }
  public actions(): WorkflowAction[] { const item = this.document(); return item ? this.actionMap[item.status] ?? [] : []; }
  public runAction(action: WorkflowAction): void {
    const item = this.document(); if (!item) return;
    const comment = this.browserDocument.defaultView?.prompt(this.t('workflowCommentPrompt')) ?? '';
    if (action.key === 'request-changes' && !comment.trim()) { this.workflowError.set(this.t('commentRequired')); return; }
    this.transitioning.set(true); this.workflowError.set('');
    this.service.transition(item.uuid, action.key, { actor: 'R&D User', comment: comment.trim() }).pipe(finalize(() => this.transitioning.set(false))).subscribe({ next: (updated) => this.document.set(updated), error: (error) => this.workflowError.set(error?.error?.message ?? error?.message ?? this.t('unknownError')) });
  }
  public print(): void { this.browserDocument.defaultView?.print(); }
  public canEdit(status: RndDocumentStatus): boolean { return status === 'DRAFT' || status === 'CHANGES_REQUESTED'; }
  public templateFields(): RndTemplateField[] { const item = this.document(); return RND_DOCUMENT_TEMPLATES.find((template) => template.type === item?.type)?.fields ?? []; }
  public templateFormNumber(): string { const item = this.document(); return RND_DOCUMENT_TEMPLATES.find((template) => template.type === item?.type)?.formNumber ?? ''; }
  public fieldLabel(field: RndTemplateField): string { const lang: AppLanguage = this.language.language(); return lang === 'vi' ? field.labelVi : lang === 'zh-TW' ? field.labelZhTw : field.label; }
  public t(key: string): string { return this.language.translate(key); }
  public statusLabel(value: string): string { return this.t(`documentStatus.${value}`); }
  public typeLabel(value: string): string { return this.t(`documentType.${value}`); }
}
