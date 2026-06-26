import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { FormulationInput, BeverageFormula, SavedBeverageFormula } from '../models/formulation.model';

/**
 * Modern NgRx Action Group for the Beverage Formulation lifecycle.
 * Source: 'Formulation' (matches '[Formulation]' prefix in DevTools)
 */
export const FormulationActions = createActionGroup({
  source: 'Formulation',
  events: {
    // Triggered when user submits the target specifications
    'Request AI Generation': props<{ 
      input: FormulationInput; 
      historicalData?: string; 
      model?: string;
    }>(),

    // Dispatched when Ollama API returns a valid structured formula
    'Generation Success': props<{ 
      formula: BeverageFormula; 
    }>(),

    // Dispatched as Ollama streams JSON fragments back to the workbench
    'Generation Progress': props<{
      partialResponse: string;
    }>(),

    // Dispatched if Ollama API times out, fails, or fails to parse
    'Generation Failure': props<{ 
      error: string; 
    }>(),

    // Fetch persisted formulas from the Giavico monolith API.
    'Load Saved Formulas': emptyProps(),

    'Load Saved Formulas Success': props<{
      savedFormulas: SavedBeverageFormula[];
    }>(),

    'Load Saved Formulas Failure': props<{
      error: string;
    }>(),

    // Persist the current formula into the saved formulas list
    'Save Formula': props<{
      input: FormulationInput;
      formula: BeverageFormula;
    }>(),

    'Save Formula Success': props<{
      savedFormula: SavedBeverageFormula;
    }>(),

    'Update Saved Formula': props<{
      id: string;
      input: FormulationInput;
      formula: BeverageFormula;
    }>(),

    'Update Saved Formula Success': props<{
      savedFormula: SavedBeverageFormula;
    }>(),

    'Delete Saved Formula': props<{
      id: string;
    }>(),

    'Delete Saved Formula Success': props<{
      id: string;
    }>(),

    // Reset formulation state back to pristine/initial values
    'Reset Formulation': emptyProps(),
  },
});

/*
 * Note: If using classic NgRx actions, they would map as follows:
 *
 * export const requestAIGeneration = createAction(
 *   '[Formulation] Request AI Generation',
 *   props<{ input: FormulationInput; historicalData?: string; model?: string }>()
 * );
 * export const generationSuccess = createAction(
 *   '[Formulation] Generation Success',
 *   props<{ formula: BeverageFormula }>()
 * );
 * export const generationFailure = createAction(
 *   '[Formulation] Generation Failure',
 *   props<{ error: string }>()
 * );
 */
