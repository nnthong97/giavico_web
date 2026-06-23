import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FORMULATION_FEATURE_KEY, FormulationState } from './formulation.reducer';

// Select the root feature state slice
export const selectFormulationState = createFeatureSelector<FormulationState>(
  FORMULATION_FEATURE_KEY
);

// Select loading status (e.g., to display active spinner/processing canvas)
export const selectFormulationLoading = createSelector(
  selectFormulationState,
  (state: FormulationState) => state.loading
);

// Select formulation error status
export const selectFormulationError = createSelector(
  selectFormulationState,
  (state: FormulationState) => state.error
);

// Select the generated Beverage Formula structure
export const selectBeverageFormula = createSelector(
  selectFormulationState,
  (state: FormulationState) => state.formula
);

// Select raw streamed JSON while Ollama is still generating
export const selectStreamingResponse = createSelector(
  selectFormulationState,
  (state: FormulationState) => state.streamingResponse
);

// Select formulas saved during the current workbench session
export const selectSavedFormulas = createSelector(
  selectFormulationState,
  (state: FormulationState) => state.savedFormulas
);

export const selectSavedFormulasError = createSelector(
  selectFormulationState,
  (state: FormulationState) => state.savedFormulasError
);

export const selectSavedFormulaById = (id: string) =>
  createSelector(selectSavedFormulas, (savedFormulas) =>
    savedFormulas.find((savedFormula) => savedFormula.id === id) ?? null
  );

// Select the target input parameters submitted by the user
export const selectFormulationInput = createSelector(
  selectFormulationState,
  (state: FormulationState) => state.input
);

// Helper selector: extract ingredients matrix directly
export const selectFormulaIngredients = createSelector(
  selectBeverageFormula,
  (formula) => formula?.ingredients || []
);

// Helper selector: extract variance analysis directly
export const selectFormulaVarianceAnalysis = createSelector(
  selectBeverageFormula,
  (formula) => formula?.varianceAnalysis || ''
);

// Helper selector: extract stability alerts directly
export const selectFormulaStabilityAlerts = createSelector(
  selectBeverageFormula,
  (formula) => formula?.stabilityAlerts || []
);
