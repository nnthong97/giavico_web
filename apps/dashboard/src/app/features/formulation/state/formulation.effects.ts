import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, switchMap, timeout } from 'rxjs/operators';
import { OllamaFormulationService } from '../data-access/ollama-formulation.service';
import { FormulationActions } from './formulation.actions';

@Injectable()
export class FormulationEffects {
  private readonly actions$ = inject(Actions);
  private readonly ollamaService = inject(OllamaFormulationService);

  /**
   * Effect that intercepts the formulation request action,
   * invokes the Ollama service to execute the local LLM generation,
   * enforces a timeout, and handles loading/success/error state transitions.
   */
  public generateFormula$ = createEffect(() =>
    this.actions$.pipe(
      // Intercept the Request AI Generation action
      ofType(FormulationActions.requestAIGeneration),
      switchMap(({ input, historicalData, model }) =>
        this.ollamaService.generateFormulaStream(input, historicalData, model).pipe(
          // Apply a timeout since local LLM generation (e.g., mistral, llama3) can be slow
          timeout(45000), // 45 seconds timeout threshold
          
          // Map streamed chunks and final JSON payload to state actions
          map((event) =>
            event.type === 'progress'
              ? FormulationActions.generationProgress({ partialResponse: event.partialResponse })
              : FormulationActions.generationSuccess({ formula: event.formula })
          ),
          
          // Handle any network, parsing, or timeout errors
          catchError((error: any) =>
            of(FormulationActions.generationFailure({ error: this.toErrorMessage(error) }))
          )
        )
      )
    )
  );

  public loadSavedFormulas$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FormulationActions.loadSavedFormulas),
      switchMap(() =>
        this.ollamaService.listSavedFormulas().pipe(
          map((savedFormulas) => FormulationActions.loadSavedFormulasSuccess({ savedFormulas })),
          catchError((error: any) =>
            of(FormulationActions.loadSavedFormulasFailure({ error: this.toErrorMessage(error) }))
          )
        )
      )
    )
  );

  public saveFormula$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FormulationActions.saveFormula),
      switchMap(({ input, formula }) =>
        this.ollamaService.storeFormula(input, formula).pipe(
          map((savedFormula) => FormulationActions.saveFormulaSuccess({ savedFormula })),
          catchError((error: any) =>
            of(FormulationActions.generationFailure({ error: this.toErrorMessage(error) }))
          )
        )
      )
    )
  );

  public updateSavedFormula$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FormulationActions.updateSavedFormula),
      switchMap(({ id, input, formula }) =>
        this.ollamaService.updateSavedFormula(id, input, formula).pipe(
          map((savedFormula) => FormulationActions.updateSavedFormulaSuccess({ savedFormula })),
          catchError((error: any) =>
            of(FormulationActions.generationFailure({ error: this.toErrorMessage(error) }))
          )
        )
      )
    )
  );

  public deleteSavedFormula$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FormulationActions.deleteSavedFormula),
      switchMap(({ id }) =>
        this.ollamaService.deleteSavedFormula(id).pipe(
          map(() => FormulationActions.deleteSavedFormulaSuccess({ id })),
          catchError((error: any) =>
            of(FormulationActions.generationFailure({ error: this.toErrorMessage(error) }))
          )
        )
      )
    )
  );

  private toErrorMessage(error: any): string {
    if (error.name === 'TimeoutError') {
      return 'Ollama request timed out (limit: 45 seconds). Check if your local Ollama instance is under heavy load.';
    }
    if (error?.status === 0) {
      return 'Cannot connect to formula-service. Ensure it is running at http://localhost:8081 and CORS allows this app origin.';
    }
    if (error instanceof HttpErrorResponse && error.error?.message) {
      const fieldErrors = error.error.fieldErrors
        ? Object.entries(error.error.fieldErrors)
            .map(([field, message]) => `${field}: ${message}`)
            .join('; ')
        : '';

      return fieldErrors ? `${error.error.message} ${fieldErrors}` : error.error.message;
    }
    if (error?.error?.message) {
      return error.error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }

    return 'An unknown error occurred during AI formulation.';
  }
}
