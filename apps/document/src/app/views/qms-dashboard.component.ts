
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { QmsDocumentController } from '../controllers/qms-document.controller';
import { QmsDocument, QmsDocumentType } from '../models/qms.models';
import { QmsDocumentTableComponent } from './qms-shared.components';

@Component({
  selector: 'app-qms-dashboard', standalone: true, imports: [RouterModule, MatButtonModule, MatIconModule, QmsDocumentTableComponent],
  template: `
    <div class="page-head"><div><span class="eyebrow">QUALITY MANAGEMENT SYSTEM</span><h1>Document Control Dashboard</h1><p>Product specifications, engineering changes and controlled acceptance standards.</p></div><a mat-flat-button color="primary" routerLink="/documents/new"><mat-icon>add</mat-icon>New document</a></div>
    <section class="metric-grid">
      @for (card of cards; track card) {
        <a class="metric" [routerLink]="['/documents']" [queryParams]="{type:card.type}"><span class="metric-icon" [class]="card.tone"><mat-icon>{{ card.icon }}</mat-icon></span><span><strong>{{ count(card.type) }}</strong><small>{{ card.label }}</small></span><mat-icon class="go">arrow_forward</mat-icon></a>
      }
    </section>
    <section class="dashboard-grid">
      <article class="panel activity"><div class="panel-head"><div><h2>Recent activities</h2><p>Latest controlled document updates</p></div><a mat-button routerLink="/documents">View all</a></div><app-qms-document-table [documents]="documents().slice(0, 5)" /></article>
      <article class="panel status-panel"><div class="panel-head"><div><h2>Workflow status</h2><p>Current document distribution</p></div></div><div class="status-total"><div class="ring"><strong>{{ documents().length }}</strong><span>Total</span></div></div><div class="status-bars">@for (item of statusCounts; track item) {
      <div><span>{{ item.label }}</span><div><i [style.width.%]="percentage(item.count())"></i></div><strong>{{ item.count() }}</strong></div>
      }</div><div class="quick-actions"><h3>Quick create</h3>@for (item of quickCreate; track item) {
      <a [routerLink]="['/documents/new']" [queryParams]="{type:item.type}"><mat-icon>{{ item.icon }}</mat-icon><span>{{ item.label }}</span><mat-icon>chevron_right</mat-icon></a>
    }</div></article>
    </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class QmsDashboardComponent implements OnInit {
  private readonly service = inject(QmsDocumentController);
  readonly documents = signal<QmsDocument[]>([]);
  readonly cards: { type: QmsDocumentType; label: string; icon: string; tone: string }[] = [
    { type: 'NEW_PRODUCT_NOTICE', label: 'New Product Notices', icon: 'science', tone: 'green' }, 
    { type: 'CHANGE_PROPOSAL', label: 'Change Proposals', icon: 'change_circle', tone: 'amber' },
    { type: 'ENGINEERING_CHANGE_REQUEST', label: 'Engineering Changes', icon: 'engineering', tone: 'blue' }, 
    { type: 'RAW_MATERIAL_STANDARD', label: 'Raw Material Standards', icon: 'inventory_2', tone: 'purple' },
    { type: 'SEMI_FINISHED_STANDARD', label: 'Semi-Finished Standards', icon: 'precision_manufacturing', tone: 'cyan' }, 
    { type: 'FINISHED_PRODUCT_STANDARD', label: 'Finished Product Standards', icon: 'verified', tone: 'rose' },
  ];
  readonly quickCreate = this.cards.slice(0, 3);
  readonly statusCounts = [
    { label: 'Draft', count: () => this.documents().filter((item) => item.status === 'DRAFT').length },
    { label: 'Pending approval', count: () => this.documents().filter((item) => item.status === 'PENDING_APPROVAL').length },
    { label: 'Approved / released', count: () => this.documents().filter((item) => ['APPROVED', 'RELEASED'].includes(item.status)).length },
  ];
  ngOnInit(): void { this.service.list().subscribe((items) => this.documents.set(items)); }
  count(type: QmsDocumentType): number { return this.documents().filter((item) => item.type === type).length; }
  percentage(count: number): number { return this.documents().length ? Math.max(8, count / this.documents().length * 100) : 0; }
}
