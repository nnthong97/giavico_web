
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { debounceTime, startWith, switchMap } from 'rxjs';
import { QmsDocumentController } from '../controllers/qms-document.controller';
import { QmsDocument, QmsDocumentType, QmsStatus, QMS_DOCUMENT_DEFINITIONS, QMS_STATUSES } from '../models/qms.models';
import { QmsConfirmDialogComponent, QmsDocumentTableComponent } from './qms-shared.components';

@Component({
  selector: 'app-qms-document-list-page', standalone: true, imports: [ReactiveFormsModule, RouterModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, QmsDocumentTableComponent],
  template: `
    <div class="page-head"><div><span class="eyebrow">CONTROLLED RECORDS</span><h1>Product Specification & Change Control</h1><p>Search, review and maintain the complete QMS document register.</p></div><a mat-flat-button color="primary" routerLink="/documents/new"><mat-icon>add</mat-icon>Create document</a></div>
    <section class="panel filters" [formGroup]="filters"><mat-form-field appearance="outline" subscriptSizing="dynamic" class="search"><mat-label>Search product or document</mat-label><mat-icon matPrefix>search</mat-icon><input matInput formControlName="search" /></mat-form-field><mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>Document type</mat-label><mat-select formControlName="type"><mat-option value="">All document types</mat-option>@for (item of definitions; track item) {
    <mat-option [value]="item.type">{{ item.name.en }}</mat-option>
    }</mat-select></mat-form-field><mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>Status</mat-label><mat-select formControlName="status"><mat-option value="">All statuses</mat-option>@for (item of statuses; track item) {
    <mat-option [value]="item">{{ statusName(item) }}</mat-option>
    }</mat-select></mat-form-field><mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>From</mat-label><input matInput type="date" formControlName="from" /></mat-form-field><mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>To</mat-label><input matInput type="date" formControlName="to" /></mat-form-field><button mat-button type="button" (click)="clear()">Clear</button></section>
    <section class="panel document-list"><div class="panel-head"><div><h2>Document register</h2><p>{{ documents().length }} matching records</p></div><button mat-stroked-button type="button" (click)="export()"><mat-icon>picture_as_pdf</mat-icon>Export PDF</button></div><app-qms-document-table [documents]="documents()" (delete)="confirmDelete($event)" /></section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QmsDocumentListPageComponent implements OnInit {
  private readonly service = inject(QmsDocumentController); private readonly dialog = inject(MatDialog); private readonly route = inject(ActivatedRoute);
  readonly documents = signal<QmsDocument[]>([]); readonly definitions = QMS_DOCUMENT_DEFINITIONS; readonly statuses = QMS_STATUSES;
  readonly filters = new FormGroup({ search: new FormControl('', { nonNullable: true }), type: new FormControl<QmsDocumentType | ''>('', { nonNullable: true }), status: new FormControl<QmsStatus | ''>('', { nonNullable: true }), from: new FormControl('', { nonNullable: true }), to: new FormControl('', { nonNullable: true }) });
  ngOnInit(): void { const type = this.route.snapshot.queryParamMap.get('type') as QmsDocumentType | null; if (type) this.filters.controls.type.setValue(type); this.filters.valueChanges.pipe(startWith(this.filters.getRawValue()), debounceTime(100), switchMap(() => this.service.list(this.filters.getRawValue()))).subscribe((items) => this.documents.set(items)); }
  clear(): void { this.filters.reset({ search: '', type: '', status: '', from: '', to: '' }); }
  statusName(value: string): string { return value.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase()); }
  confirmDelete(document: QmsDocument): void { this.dialog.open(QmsConfirmDialogComponent, { data: document, width: '430px' }).afterClosed().subscribe((confirmed) => { if (confirmed) this.service.delete(document.id).pipe(switchMap(() => this.service.list(this.filters.getRawValue()))).subscribe((items) => this.documents.set(items)); }); }
  export(): void { window.print(); }
}
