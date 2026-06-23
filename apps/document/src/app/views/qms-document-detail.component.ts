import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { switchMap } from 'rxjs';
import { QmsDocumentController } from '../controllers/qms-document.controller';
import { QmsDocument, QmsFieldDefinition, QmsStatus, definitionFor } from '../models/qms.models';
import { QmsConfirmDialogComponent, QmsLabelComponent } from './qms-shared.components';

@Component({
  selector: 'app-qms-document-detail', standalone: true, imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, QmsLabelComponent],
  template: `
    @if (document(); as item) {
      <div class="page-head compact"><div><a class="back" routerLink="/documents"><mat-icon>arrow_back</mat-icon>Document register</a><span class="eyebrow">{{ item.documentNumber }}</span><h1>{{ definition(item).name.en }}</h1><p>{{ item.productCode }} · {{ item.productName }}</p></div><div class="detail-actions"><span class="status-large" [attr.data-status]="item.status">{{ statusName(item.status) }}</span><button mat-stroked-button (click)="print()"><mat-icon>picture_as_pdf</mat-icon>Print / PDF</button><a mat-flat-button color="primary" [routerLink]="['/documents', item.id, 'edit']"><mat-icon>edit</mat-icon>Edit</a></div></div>
      <div class="detail-grid"><div>
        <section class="panel detail-card"><div class="section-title"><span>01</span><div><h2>Document information</h2><p>Controlled record identity</p></div></div><dl class="metadata"><div><dt>Document number</dt><dd>{{ item.documentNumber }}</dd></div><div><dt>Status</dt><dd>{{ statusName(item.status) }}</dd></div><div><dt>Created</dt><dd>{{ item.createdAt | date:'medium' }}</dd></div><div><dt>Last updated</dt><dd>{{ item.updatedAt | date:'medium' }}</dd></div></dl></section>
        @for (section of sections(item); track section; let i = $index) {
          <section class="panel detail-card"><div class="section-title"><span>{{ i + 2 | number:'2.0' }}</span><div><h2>{{ section }}</h2><p>Approved specification values</p></div></div><div class="value-grid">@for (field of fields(item, section); track field) {
          <div><app-qms-label [label]="field.label" /><strong>{{ display(item.values[field.key]) }}</strong></div>
        }</div></section>
      }
      <section class="panel detail-card"><div class="section-title"><span>A</span><div><h2>Approval workflow</h2><p>Review and authorization sequence</p></div></div><div class="approval-view">@for (step of item.approvals; track step) {
      <div><mat-icon>{{ step.decision === 'APPROVED' ? 'check_circle' : step.decision === 'REJECTED' ? 'cancel' : 'schedule' }}</mat-icon><span><strong>{{ step.role }}</strong><small>{{ step.approver || 'Not assigned' }}</small></span><b>{{ step.decision }}</b></div>
      }@if (!item.approvals.length) {
      <p>No approval steps required.</p>
    }</div></section>
    </div><aside class="detail-side"><section class="panel lifecycle"><h2>Lifecycle actions</h2><p>Move this record through the controlled workflow.</p>@if (item.status === 'DRAFT' || item.status === 'REJECTED') {
    <button mat-flat-button color="primary" (click)="status(item, 'PENDING_APPROVAL')">Submit for approval</button>
    }@if (item.status === 'PENDING_APPROVAL') {
    <button mat-flat-button color="primary" (click)="status(item, 'APPROVED')">Approve document</button>
    }@if (item.status === 'PENDING_APPROVAL') {
    <button mat-stroked-button (click)="status(item, 'REJECTED')">Reject</button>
    }@if (item.status === 'APPROVED') {
    <button mat-flat-button color="primary" (click)="status(item, 'RELEASED')">Release document</button>
    }@if (item.status === 'RELEASED') {
    <button mat-stroked-button (click)="status(item, 'ARCHIVED')">Archive</button>
    }<button mat-button color="warn" (click)="remove(item)"><mat-icon>delete_outline</mat-icon>Delete</button></section><section class="panel audit"><h2>Audit trail</h2><p>Immutable event placeholder</p>@for (event of item.auditTrail; track event) {
    <div><i></i><span><strong>{{ event.action }}</strong><small>{{ event.actor }} · {{ event.at | date:'medium' }}</small></span></div>
    }</section></aside></div>
    } @else {
      <div class="loading">Loading controlled document...</div>
    }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QmsDocumentDetailComponent implements OnInit {
  private readonly service = inject(QmsDocumentController); private readonly route = inject(ActivatedRoute); private readonly router = inject(Router); private readonly dialog = inject(MatDialog); readonly document = signal<QmsDocument | null>(null);
  ngOnInit(): void { this.service.get(this.route.snapshot.paramMap.get('id')!).subscribe((item) => this.document.set(item)); }
  definition(item: QmsDocument) { return definitionFor(item.type); } sections(item: QmsDocument): string[] { return [...new Set(this.definition(item).fields.map((field) => field.section || 'General'))]; } fields(item: QmsDocument, section: string): QmsFieldDefinition[] { return this.definition(item).fields.filter((field) => (field.section || 'General') === section); }
  display(value: unknown): string { return Array.isArray(value) ? value.join(', ') || 'Not specified' : String(value || 'Not specified'); } statusName(value: string): string { return value.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase()); }
  status(item: QmsDocument, status: QmsStatus): void { this.service.setStatus(item.id, status).subscribe((updated) => this.document.set(updated)); } print(): void { window.print(); }
  remove(item: QmsDocument): void { this.dialog.open(QmsConfirmDialogComponent, { data: item, width: '430px' }).afterClosed().pipe(switchMap((confirmed) => confirmed ? this.service.delete(item.id) : [])).subscribe(() => this.router.navigate(['/documents'])); }
}
