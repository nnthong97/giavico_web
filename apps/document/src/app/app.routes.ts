import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadChildren: () => import('./routes/qms.routes').then((module) => module.QMS_ROUTES),
  },
];
