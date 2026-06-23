import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./features/inventory/pages/inventory-management.component').then(
        (module) => module.InventoryManagementComponent
      ),
  },
];
