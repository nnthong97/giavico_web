import { createReducer, on } from '@ngrx/store';
import { BeverageFormula, FormulationInput, SavedBeverageFormula } from '../models/formulation.model';
import { FormulationActions } from './formulation.actions';

export const FORMULATION_FEATURE_KEY = 'formulation';

export interface FormulationState {
  formula: BeverageFormula | null;
  savedFormulas: SavedBeverageFormula[];
  savedFormulasError: string | null;
  streamingResponse: string;
  input: FormulationInput | null;
  loading: boolean;
  error: string | null;
}

export const initialFormulationState: FormulationState = {
  formula: null,
  savedFormulas: [],
  savedFormulasError: null,
  streamingResponse: '',
  input: null,
  loading: false,
  error: null,
};

export const formulationReducer = createReducer(
  initialFormulationState,

  // Start the loading sequence when AI formulation is requested
  on(FormulationActions.requestAIGeneration, (state, { input }) => ({
    ...state,
    input,
    formula: null,
    streamingResponse: '',
    loading: true,
    error: null,
  })),

  // Keep the output panel updated while Ollama is still generating
  on(FormulationActions.generationProgress, (state, { partialResponse }) => ({
    ...state,
    streamingResponse: partialResponse,
  })),

  // Save the structured formula output on successful API response
  on(FormulationActions.generationSuccess, (state, { formula }) => ({
    ...state,
    formula,
    streamingResponse: '',
    loading: false,
    error: null,
  })),

  // Handle failure by clearing loading state and registering the error
  on(FormulationActions.generationFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Replace the saved formulas list with persisted backend data
  on(FormulationActions.loadSavedFormulasSuccess, (state, { savedFormulas }) => ({
    ...state,
    savedFormulas,
    savedFormulasError: null,
  })),

  // Keep saved-list connectivity separate from formula generation errors
  on(FormulationActions.loadSavedFormulasFailure, (state, { error }) => ({
    ...state,
    savedFormulasError: error,
  })),

  // Append the latest persisted formula to the saved formulas list
  on(FormulationActions.saveFormulaSuccess, (state, { savedFormula }) => ({
    ...state,
    savedFormulas: [
      savedFormula,
      ...state.savedFormulas.filter((formula) => formula.id !== savedFormula.id),
    ],
  })),

  on(FormulationActions.updateSavedFormulaSuccess, (state, { savedFormula }) => ({
    ...state,
    savedFormulas: state.savedFormulas.map((formula) =>
      formula.id === savedFormula.id ? savedFormula : formula
    ),
  })),

  on(FormulationActions.deleteSavedFormulaSuccess, (state, { id }) => ({
    ...state,
    savedFormulas: state.savedFormulas.filter((formula) => formula.id !== id),
  })),

  // Reset formulation state back to default
  on(FormulationActions.resetFormulation, () => initialFormulationState)
);
