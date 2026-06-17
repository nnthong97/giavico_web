import { Routes } from '@angular/router';
import { QmsShellComponent } from './qms-shell.component';

export const QMS_ROUTES: Routes = [{
  path: '', component: QmsShellComponent, children: [
    { path: '', loadComponent: () => import('./qms-dashboard.component').then((m) => m.QmsDashboardComponent) },
    { path: 'documents', loadComponent: () => import('./qms-document-list.component').then((m) => m.QmsDocumentListPageComponent) },
    { path: 'documents/new', loadComponent: () => import('./qms-document-editor.component').then((m) => m.QmsDocumentEditorComponent) },
    { path: 'documents/:id/edit', loadComponent: () => import('./qms-document-editor.component').then((m) => m.QmsDocumentEditorComponent) },
    { path: 'documents/:id', loadComponent: () => import('./qms-document-detail.component').then((m) => m.QmsDocumentDetailComponent) },
  ],
}];
