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
    path: 'planning',
    loadComponent: () =>
      import('./features/planning/pages/planning-shell.component').then(m => m.PlanningShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/planning/pages/planning-dashboard.component').then(m => m.PlanningDashboardComponent),
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/planning/pages/planning-orders.component').then(m => m.PlanningOrdersComponent),
      },
      {
        path: 'schedule',
        loadComponent: () => import('./features/planning/pages/planning-schedule.component').then(m => m.PlanningScheduleComponent),
      },
      {
        path: 'inventory',
        loadComponent: () => import('./features/planning/pages/planning-inventory.component').then(m => m.PlanningInventoryComponent),
      },
      {
        path: 'delivery',
        loadComponent: () => import('./features/planning/pages/planning-delivery.component').then(m => m.PlanningDeliveryComponent),
      },
    ],
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
