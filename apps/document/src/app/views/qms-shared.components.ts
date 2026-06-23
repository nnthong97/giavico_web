import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { BilingualLabel, QmsDocument, QmsDocumentType, QmsStatus, definitionFor } from '../models/qms.models';

@Component({
  selector: 'app-qms-label', standalone: true, imports: [],
  template: `<span class="label-en">{{ label.en }}</span><small>{{ label.vi }} · {{ label.zh }}</small>`,
  styles: [':host{display:flex;flex-direction:column;line-height:1.25}.label-en{font-weight:650;color:#18352e}small{font-size:11px;color:#75847f;margin-top:2px}'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QmsLabelComponent { @Input({ required: true }) label!: BilingualLabel; }

@Component({
  selector: 'app-qms-specification-input', standalone: true, imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  template: `<mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>Target / range</mat-label><input matInput [formControl]="control" placeholder="e.g. 28 +/- 1" /></mat-form-field>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QmsSpecificationInputComponent { @Input({ required: true }) control!: FormControl; }

@Component({
  selector: 'app-qms-approval-workflow', standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule],
  template: `
    <div class="approval-list" [formGroup]="hostForm">
      @for (group of groups; track group; let index = $index) {
        <div class="approval-row" [formGroup]="group">
          <div class="step-number">{{ index + 1 }}</div>
          <div class="step-role"><strong>{{ group.controls['role'].value }}</strong><span>Approval step</span></div>
          <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>Approver</mat-label><input matInput formControlName="approver" /></mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>Decision</mat-label><mat-select formControlName="decision"><mat-option value="WAITING">Waiting</mat-option><mat-option value="APPROVED">Approved</mat-option><mat-option value="REJECTED">Rejected</mat-option></mat-select></mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>Comment</mat-label><input matInput formControlName="comment" /></mat-form-field>
        </div>
      }
      @if (!groups.length) {
        <p class="empty">No approval is required for this tracking record.</p>
      }
    </div>`,
  styles: [`
    .approval-list{display:grid;gap:10px}.approval-row{display:grid;grid-template-columns:34px minmax(170px,1fr) 1fr 150px 1fr;align-items:center;gap:12px;padding:10px;border:1px solid #dfe7e3;border-radius:10px;background:#fbfdfc}
    .step-number{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#0b6b53;color:#fff;font-weight:700}.step-role{display:flex;flex-direction:column}.step-role span,.empty{font-size:12px;color:#718079}@media(max-width:900px){.approval-row{grid-template-columns:34px 1fr}.approval-row mat-form-field{grid-column:2}}
  `], changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QmsApprovalWorkflowComponent {
  @Input({ required: true }) formArray!: FormArray;
  readonly hostForm = new FormGroup({});
  get groups(): FormGroup[] { return this.formArray.controls as FormGroup[]; }
}

@Component({
  selector: 'app-qms-document-table', standalone: true,
  imports: [DatePipe, RouterModule, MatTableModule, MatButtonModule, MatIconModule, MatChipsModule],
  template: `
    <div class="table-wrap">
      <table mat-table [dataSource]="documents">
        <ng-container matColumnDef="number"><th mat-header-cell *matHeaderCellDef>Document</th><td mat-cell *matCellDef="let row"><strong>{{ row.documentNumber }}</strong><small>{{ typeName(row.type) }}</small></td></ng-container>
        <ng-container matColumnDef="product"><th mat-header-cell *matHeaderCellDef>Product</th><td mat-cell *matCellDef="let row"><strong>{{ row.productName }}</strong><small>{{ row.productCode || 'No product code' }}</small></td></ng-container>
        <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let row"><span class="status" [attr.data-status]="row.status">{{ statusName(row.status) }}</span></td></ng-container>
        <ng-container matColumnDef="updated"><th mat-header-cell *matHeaderCellDef>Updated</th><td mat-cell *matCellDef="let row">{{ row.updatedAt | date:'dd MMM yyyy' }}</td></ng-container>
        <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let row" class="actions"><a mat-icon-button [routerLink]="['/documents', row.id]" aria-label="View"><mat-icon>visibility</mat-icon></a><a mat-icon-button [routerLink]="['/documents', row.id, 'edit']" aria-label="Edit"><mat-icon>edit</mat-icon></a><button mat-icon-button type="button" (click)="delete.emit(row)" aria-label="Delete"><mat-icon>delete_outline</mat-icon></button></td></ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr><tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
      @if (!documents.length) {
        <div class="empty"><mat-icon>folder_open</mat-icon><strong>No matching documents</strong><span>Adjust the filters or create a controlled document.</span></div>
      }
    </div>`,
  styles: [`
    .table-wrap{overflow:auto}table{width:100%;background:transparent}th{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#697a74}td strong,td small{display:block}td small{color:#718079;margin-top:3px}.actions{white-space:nowrap;text-align:right}.status{display:inline-flex;padding:5px 9px;border-radius:20px;background:#eef2f0;color:#49605a;font-size:12px;font-weight:700}.status[data-status=APPROVED],.status[data-status=RELEASED]{background:#ddf5e8;color:#17633f}.status[data-status=PENDING_APPROVAL]{background:#fff0cc;color:#865b00}.status[data-status=REJECTED]{background:#fde4e2;color:#9b2d28}.empty{min-height:250px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#74827d;gap:6px}.empty mat-icon{font-size:42px;width:42px;height:42px;color:#aebbb6}
  `], changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QmsDocumentTableComponent {
  @Input() documents: QmsDocument[] = [];
  @Output() delete = new EventEmitter<QmsDocument>();
  readonly columns = ['number', 'product', 'status', 'updated', 'actions'];
  typeName(type: QmsDocumentType): string { return definitionFor(type).name.en; }
  statusName(status: QmsStatus): string { return status.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase()); }
}

@Component({
  selector: 'app-qms-confirm-dialog', standalone: true, imports: [MatDialogModule, MatButtonModule],
  template: `<h2 mat-dialog-title>Delete controlled document?</h2><mat-dialog-content>This removes <strong>{{ data.documentNumber }}</strong> from the mock repository. This action cannot be undone.</mat-dialog-content><mat-dialog-actions align="end"><button mat-button mat-dialog-close>Cancel</button><button mat-flat-button color="warn" [mat-dialog-close]="true">Delete</button></mat-dialog-actions>`,
})
export class QmsConfirmDialogComponent {
  readonly data = inject<{ documentNumber: string }>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<QmsConfirmDialogComponent>);
}
