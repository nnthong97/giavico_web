import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: 'qms',
    loadChildren: () => import('./qms/qms.routes').then((m) => m.QMS_ROUTES),
  },
  {
    path: '',
    loadComponent: () =>
      import('@giavico-web/data-access').then(
        (m) => m.FormulatorWorkbenchComponent
      ),
  },
  {
    path: 'formulas/:id',
    loadComponent: () =>
      import('@giavico-web/data-access').then((m) => m.FormulaDetailComponent),
  },
  {
    path: 'documents',
    loadComponent: () =>
      import('@giavico-web/data-access').then((m) => m.RndDocumentListComponent),
  },
  {
    path: 'documents/new',
    loadComponent: () =>
      import('@giavico-web/data-access').then((m) => m.RndDocumentEditorComponent),
  },
  {
    path: 'documents/:id/edit',
    loadComponent: () =>
      import('@giavico-web/data-access').then((m) => m.RndDocumentEditorComponent),
  },
  {
    path: 'documents/:id',
    loadComponent: () =>
      import('@giavico-web/data-access').then((m) => m.RndDocumentDetailComponent),
  },
];
