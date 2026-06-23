import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';

import { provideHttpClient } from '@angular/common/http';
import { provideStore, provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { FormulationEffects } from './features/formulation/state/formulation.effects';
import { FORMULATION_FEATURE_KEY, formulationReducer } from './features/formulation/state/formulation.reducer';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideAnimationsAsync(),
    provideStore(),
    provideState(FORMULATION_FEATURE_KEY, formulationReducer),
    provideEffects(FormulationEffects),
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
  ],
};
