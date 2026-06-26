import { ChangeDetectionStrategy, Component, HostBinding, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { RndDocumentStatus, RndDocumentSummary } from '../models/rnd-document.model';
import { LanguageService } from '../../../core/i18n/language.service';
import { RndDocumentService } from '../data-access/rnd-document.service';
import { RndDocumentHeaderComponent } from '../ui/rnd-document-header.component';

@Component({
  selector: 'app-rnd-document-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RndDocumentHeaderComponent],
  template: `
    <div class="document-app" [class.embedded]="embedded">
      <app-rnd-document-header *ngIf="!embedded" />
      <main class="document-page">
        <div class="page-title-row">
          <div><span class="eyebrow">{{ t('documentControl') }}</span><h1>{{ t('rndDocuments') }}</h1><p>{{ t('documentControlSubtitle') }}</p></div>
          <a routerLink="/documents/new" class="button primary">+ {{ t('newDocument') }}</a>
        </div>

        <section class="toolbar">
          <label class="search-field"><span>{{ t('search') }}</span><input [(ngModel)]="search" (keyup.enter)="load()" [placeholder]="t('searchDocuments')" /></label>
          <label><span>{{ t('status') }}</span><select [(ngModel)]="status" (change)="load()"><option value="">{{ t('allStatuses') }}</option><option *ngFor="let option of statuses" [value]="option">{{ statusLabel(option) }}</option></select></label>
          <button type="button" class="button secondary" (click)="load()">{{ t('apply') }}</button>
        </section>

        <section class="table-panel">
          <div *ngIf="loading()" class="state-message">{{ t('loadingDocuments') }}</div>
          <div *ngIf="error()" class="state-message error"><strong>{{ t('documentsUnavailable') }}</strong><span>{{ error() }}</span><button class="button secondary" (click)="load()">{{ t('retry') }}</button></div>
          <div *ngIf="!loading() && !error() && documents().length === 0" class="state-message"><strong>{{ t('noDocuments') }}</strong><span>{{ t('noDocumentsHint') }}</span></div>
          <div *ngIf="documents().length > 0" class="table-scroll">
            <table>
              <thead><tr><th>{{ t('documentNumber') }}</th><th>{{ t('title') }}</th><th>{{ t('product') }}</th><th>{{ t('status') }}</th><th>{{ t('revision') }}</th><th>{{ t('updated') }}</th><th></th></tr></thead>
              <tbody>
                <tr *ngFor="let document of documents()">
                  <td><strong>{{ document.documentNumber }}</strong></td>
                  <td><span class="cell-title">{{ document.title }}</span><small>{{ typeLabel(document.type) }}</small></td>
                  <td>{{ document.productName }}</td>
                  <td><span class="status" [attr.data-status]="document.status">{{ statusLabel(document.status) }}</span></td>
                  <td>R{{ document.revision }}</td>
                  <td>{{ document.updatedAt | date:'mediumDate' }}</td>
                  <td><a [routerLink]="['/documents', document.uuid]" class="row-link">{{ t('open') }}</a></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  `,
  styleUrls: ['../styles/rnd-documents.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RndDocumentListComponent implements OnInit {
  @Input() public embedded = false;
  @HostBinding('class.embedded-mode') public get embeddedMode(): boolean { return this.embedded; }

  private readonly service = inject(RndDocumentService);
  private readonly language = inject(LanguageService);
  public readonly documents = signal<RndDocumentSummary[]>([]);
  public readonly loading = signal(false);
  public readonly error = signal('');
  public search = '';
  public status: RndDocumentStatus | '' = '';
  public readonly statuses: RndDocumentStatus[] = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'ISSUED', 'ACKNOWLEDGED', 'SUPERSEDED'];

  public ngOnInit(): void { this.load(); }

  public load(): void {
    this.loading.set(true); this.error.set('');
    this.service.list(0, 50, this.status || undefined, this.search).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (page) => this.documents.set(page.content ?? []),
      error: (error) => this.error.set(error?.error?.message ?? error?.message ?? this.t('unknownError')),
    });
  }

  public t(key: string): string { return this.language.translate(key); }
  public statusLabel(value: string): string { return this.t(`documentStatus.${value}`); }
  public typeLabel(value: string): string { return this.t(`documentType.${value}`); }
}
