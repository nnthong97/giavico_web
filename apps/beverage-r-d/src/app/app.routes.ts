import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./features/formulation/pages/workbench.component').then(
        (module) => module.FormulatorWorkbenchComponent
      ),
  },
  {
    path: 'formulas/:id',
    loadComponent: () =>
      import('./features/formulation/pages/formula-detail.component').then((module) => module.FormulaDetailComponent),
  },
  {
    path: 'documents',
    loadComponent: () =>
      import('./features/rnd-documents/pages/rnd-document-list.component').then((module) => module.RndDocumentListComponent),
  },
  {
    path: 'documents/new',
    loadComponent: () =>
      import('./features/rnd-documents/pages/rnd-document-editor.component').then((module) => module.RndDocumentEditorComponent),
  },
  {
    path: 'documents/:id/edit',
    loadComponent: () =>
      import('./features/rnd-documents/pages/rnd-document-editor.component').then((module) => module.RndDocumentEditorComponent),
  },
  {
    path: 'documents/:id',
    loadComponent: () =>
      import('./features/rnd-documents/pages/rnd-document-detail.component').then((module) => module.RndDocumentDetailComponent),
  },
];
