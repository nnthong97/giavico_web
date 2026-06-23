import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { QmsDocumentController } from '../controllers/qms-document.controller';
import { ApprovalStep, QmsDocumentDefinition, QmsDocumentType, QmsFieldDefinition, QMS_DOCUMENT_DEFINITIONS, definitionFor } from '../models/qms.models';
import { QmsApprovalWorkflowComponent, QmsLabelComponent, QmsSpecificationInputComponent } from './qms-shared.components';

@Component({
  selector: 'app-qms-document-editor', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, QmsLabelComponent, QmsSpecificationInputComponent, QmsApprovalWorkflowComponent],
  template: `
    <div class="page-head compact"><div><a class="back" routerLink="/documents"><mat-icon>arrow_back</mat-icon>Document register</a><span class="eyebrow">{{ definition().formNumber }}</span><h1>{{ documentId ? 'Edit' : 'Create' }} {{ definition().name.en }}</h1><p>{{ definition().name.vi }} · {{ definition().name.zh }}</p></div><span class="draft-pill">Draft</span></div>
    <form [formGroup]="form" (ngSubmit)="save()">
      <section class="panel form-card"><div class="section-title"><span>01</span><div><h2>Document information</h2><p>Classification and product identification</p></div></div><div class="form-grid">
      <mat-form-field appearance="outline"><mat-label>Document type</mat-label><mat-select formControlName="type" (selectionChange)="changeType($event.value)">@for (item of definitions; track item) {
      <mat-option [value]="item.type">{{ item.name.en }}</mat-option>
    }</mat-select></mat-form-field>
    <mat-form-field appearance="outline"><mat-label>Product code</mat-label><input matInput formControlName="productCode" /><mat-error>Product code is required</mat-error></mat-form-field>
    <mat-form-field appearance="outline"><mat-label>Product / material name</mat-label><input matInput formControlName="productName" /><mat-error>Name is required</mat-error></mat-form-field>
    </div></section>
    @for (section of sections(); track section; let sectionIndex = $index) {
      <section class="panel form-card"><div class="section-title"><span>{{ sectionIndex + 2 | number:'2.0' }}</span><div><h2>{{ section }}</h2><p>GIAVICO controlled form fields</p></div></div><div class="form-grid fields" formGroupName="values">
      @for (field of fieldsFor(section); track field) {
        <div class="dynamic-field" [class.wide]="field.type === 'textarea' || field.type === 'checkbox-group'">
          <app-qms-label [label]="field.label" />
          @if (field.type === 'text' || field.type === 'number' || field.type === 'date') {
            <mat-form-field appearance="outline" subscriptSizing="dynamic"><input matInput [type]="field.type" [formControlName]="field.key" /><mat-error>This field is required</mat-error></mat-form-field>
          }
          @if (field.type === 'textarea') {
            <mat-form-field appearance="outline" subscriptSizing="dynamic"><textarea matInput rows="4" [formControlName]="field.key"></textarea><mat-error>This field is required</mat-error></mat-form-field>
          }
          @if (field.type === 'select') {
            <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-select [formControlName]="field.key">@for (option of field.options; track option) {
              <mat-option [value]="option">{{ option }}</mat-option>
              }</mat-select><mat-error>This field is required</mat-error></mat-form-field>
            }
            @if (field.type === 'specification') {
              <app-qms-specification-input [control]="fieldControl(field.key)" />
            }
            @if (field.type === 'checkbox-group') {
              <div class="checkbox-grid">@for (option of field.options; track option) {
                <mat-checkbox [checked]="isChecked(field.key, option)" (change)="toggleOption(field.key, option, $event.checked)">{{ option }}</mat-checkbox>
              }</div>
            }
          </div>
        }
      </div></section>
    }
    <section class="panel form-card"><div class="section-title"><span>{{ sections().length + 2 | number:'2.0' }}</span><div><h2>Approval workflow</h2><p>Named review and authorization sequence</p></div></div><app-qms-approval-workflow [formArray]="approvals" /></section>
    <div class="form-footer"><div><mat-icon>info</mat-icon>Required fields are validated before the draft is saved.</div><a mat-button routerLink="/documents">Cancel</a><button mat-stroked-button type="button" (click)="print()"><mat-icon>print</mat-icon>Print / PDF</button><button mat-flat-button color="primary" type="submit" [disabled]="saving()"><mat-icon>save</mat-icon>{{ saving() ? 'Saving...' : 'Save document' }}</button></div>
    </form>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QmsDocumentEditorComponent implements OnInit {
  private readonly service = inject(QmsDocumentController); private readonly route = inject(ActivatedRoute); private readonly router = inject(Router); private readonly snack = inject(MatSnackBar);
  readonly definitions = QMS_DOCUMENT_DEFINITIONS; readonly definition = signal<QmsDocumentDefinition>(QMS_DOCUMENT_DEFINITIONS[0]); readonly sections = signal<string[]>([]); readonly saving = signal(false); documentId: string | null = null;
  readonly form = new FormGroup({ type: new FormControl<QmsDocumentType>('NEW_PRODUCT_NOTICE', { nonNullable: true, validators: Validators.required }), productCode: new FormControl('', { nonNullable: true, validators: Validators.required }), productName: new FormControl('', { nonNullable: true, validators: Validators.required }), values: new FormGroup<Record<string, FormControl>>({}), approvals: new FormArray<FormGroup>([]) });
  get values(): FormGroup { return this.form.controls.values; } get approvals(): FormArray { return this.form.controls.approvals; }
  ngOnInit(): void {
    this.documentId = this.route.snapshot.paramMap.get('id'); const requested = this.route.snapshot.queryParamMap.get('type') as QmsDocumentType | null; this.build(requested && QMS_DOCUMENT_DEFINITIONS.some((item) => item.type === requested) ? requested : 'NEW_PRODUCT_NOTICE');
    if (this.documentId) this.service.get(this.documentId).subscribe((document) => { this.build(document.type); this.form.patchValue({ type: document.type, productCode: document.productCode, productName: document.productName }); this.values.patchValue(document.values); this.loadApprovals(document.approvals); });
  }
  changeType(type: QmsDocumentType): void { this.build(type); }
  build(type: QmsDocumentType): void { const definition = definitionFor(type); this.definition.set(definition); this.form.controls.type.setValue(type, { emitEvent: false }); Object.keys(this.values.controls).forEach((key) => this.values.removeControl(key)); definition.fields.forEach((item) => this.values.addControl(item.key, new FormControl(item.type === 'checkbox-group' ? [] : '', item.required ? Validators.required : []))); this.sections.set([...new Set(definition.fields.map((item) => item.section || 'General'))]); this.loadApprovals(definition.approvals.map((role) => ({ role, approver: '', decision: 'WAITING' }))); }
  loadApprovals(items: ApprovalStep[]): void { this.approvals.clear(); items.forEach((item) => this.approvals.push(new FormGroup({ role: new FormControl(item.role, { nonNullable: true }), approver: new FormControl(item.approver || '', { nonNullable: true }), decision: new FormControl(item.decision, { nonNullable: true }), comment: new FormControl(item.comment || '', { nonNullable: true }) }))); }
  fieldsFor(section: string): QmsFieldDefinition[] { return this.definition().fields.filter((item) => (item.section || 'General') === section); }
  fieldControl(key: string): FormControl { return this.values.get(key) as FormControl; }
  isChecked(key: string, option: string): boolean { return ((this.values.get(key)?.value || []) as string[]).includes(option); }
  toggleOption(key: string, option: string, checked: boolean): void { const control = this.values.get(key)!; const current = [...(control.value || [])]; control.setValue(checked ? [...current, option] : current.filter((item) => item !== option)); control.markAsTouched(); }
  save(): void { this.syncProductIdentity(); if (this.form.invalid) { this.form.markAllAsTouched(); this.snack.open('Complete the required fields before saving.', 'Dismiss', { duration: 3500 }); return; } this.saving.set(true); const raw = this.form.getRawValue(); const request = { type: raw.type!, productCode: raw.productCode!, productName: raw.productName!, values: raw.values!, approvals: raw.approvals as ApprovalStep[] }; const operation = this.documentId ? this.service.update(this.documentId, request) : this.service.create(request); operation.pipe(finalize(() => this.saving.set(false))).subscribe((document) => { this.snack.open('Document saved', 'Close', { duration: 2000 }); this.router.navigate(['/documents', document.id]); }); }
  private syncProductIdentity(): void { const code = this.form.controls.productCode.value; const name = this.form.controls.productName.value; ['productCode', 'vnProductCode', 'materialCode'].forEach((key) => { const control = this.values.get(key); if (control && !control.value) control.setValue(code); }); const nameControl = this.values.get('productName'); if (nameControl && !nameControl.value) nameControl.setValue(name); }
  print(): void { window.print(); }
}
