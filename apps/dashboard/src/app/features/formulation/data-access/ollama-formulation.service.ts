import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { defer, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  BeverageFormula,
  ChatHistoryMessage,
  ChatStreamEvent,
  FormulationInput,
  FormulationStreamEvent,
  SavedBeverageFormula,
} from '../models/formulation.model';
import { chooseGeminiModel } from './ai-model-options';

@Injectable({
  providedIn: 'root',
})
export class OllamaFormulationService {
  private readonly http = inject(HttpClient);
  private readonly geminiProxyApiUrl = '/api/gemini';
  private readonly savedFormulasStorageKey = 'giavico_demo_saved_formulas';
  private sessionGeminiApiKey = '';

  public setSessionGeminiApiKey(apiKey: string): void {
    this.sessionGeminiApiKey = apiKey.trim();
  }

  public generateFormula(
    input: FormulationInput,
    historicalData?: string,
    model?: string,
  ): Observable<BeverageFormula> {
    return this.http
      .post<BeverageFormula>(
        this.geminiProxyApiUrl,
        {
          useCase: 'formula',
          model: chooseGeminiModel('formula', model).model,
          input: this.normalizeFormulationInput(input),
          historicalData,
        },
        this.buildGeminiRequestOptions(),
      )
      .pipe(map((formula) => this.validateAndNormalizeFormula(formula)));
  }

  public generateFormulaStream(
    input: FormulationInput,
    historicalData?: string,
    model?: string,
  ): Observable<FormulationStreamEvent> {
    return this.generateFormula(input, historicalData, model).pipe(
      map(
        (formula) =>
          ({ type: 'complete', formula }) satisfies FormulationStreamEvent,
      ),
    );
  }

  public chat(message: string, model?: string): Observable<string> {
    return this.http
      .post<{ message: string }>(
        this.geminiProxyApiUrl,
        {
          useCase: 'chat',
          model: chooseGeminiModel('chat', model).model,
          message,
        },
        this.buildGeminiRequestOptions(),
      )
      .pipe(map((response) => response.message));
  }

  public chatStream(
    message: string,
    model?: string,
  ): Observable<ChatStreamEvent> {
    return this.chat(message, model).pipe(
      map(
        (response) =>
          ({ type: 'complete', response }) satisfies ChatStreamEvent,
      ),
    );
  }

  public getOpenAiKeyStatus(): Observable<{
    configured: boolean;
    provider: string;
    model: string;
  }> {
    return this.http.get<{
      configured: boolean;
      provider: string;
      model: string;
    }>(this.geminiProxyApiUrl, this.buildGeminiRequestOptions());
  }

  public storeFormula(
    input: FormulationInput,
    formula: BeverageFormula,
  ): Observable<SavedBeverageFormula> {
    return defer(() => of(this.storeSavedFormula(input, formula)));
  }

  public listSavedFormulas(
    page = 0,
    size = 20,
  ): Observable<SavedBeverageFormula[]> {
    return of(this.getSavedFormulas().slice(page * size, page * size + size));
  }

  public getSavedFormula(id: string): Observable<SavedBeverageFormula> {
    return defer(() => {
      const savedFormula = this.getSavedFormulas().find(
        (item) => item.id === id,
      );

      if (!savedFormula) {
        throw new Error('Saved demo formula was not found in this browser.');
      }

      return of(savedFormula);
    });
  }

  public updateSavedFormula(
    id: string,
    input: FormulationInput,
    formula: BeverageFormula,
  ): Observable<SavedBeverageFormula> {
    return defer(() => of(this.updateStoredFormula(id, input, formula)));
  }

  public deleteSavedFormula(id: string): Observable<void> {
    return defer(() => {
      this.setSavedFormulas(
        this.getSavedFormulas().filter((formula) => formula.id !== id),
      );
      return of(undefined);
    });
  }

  public listChatMessages(): Observable<ChatHistoryMessage[]> {
    return of([]);
  }

  public storeChatMessage(
    role: 'user' | 'assistant',
    content: string,
  ): Observable<ChatHistoryMessage> {
    return of({
      id: `${Date.now()}`,
      role,
      content,
      createdAt: new Date().toISOString(),
    });
  }

  public clearChatMessages(): Observable<void> {
    return of(undefined);
  }

  private buildGeminiRequestOptions(): {
    headers?: Record<string, string>;
  } {
    return this.sessionGeminiApiKey
      ? {
          headers: {
            'X-Giavico-Gemini-Key': this.sessionGeminiApiKey,
          },
        }
      : {};
  }

  private storeSavedFormula(
    input: FormulationInput,
    formula: BeverageFormula,
  ): SavedBeverageFormula {
    const savedFormula = this.buildSavedFormula(
      `demo-${Date.now()}`,
      input,
      formula,
    );
    this.setSavedFormulas([savedFormula, ...this.getSavedFormulas()]);
    return savedFormula;
  }

  private updateStoredFormula(
    id: string,
    input: FormulationInput,
    formula: BeverageFormula,
  ): SavedBeverageFormula {
    const savedFormula = this.buildSavedFormula(id, input, formula);
    this.setSavedFormulas([
      savedFormula,
      ...this.getSavedFormulas().filter((item) => item.id !== id),
    ]);
    return savedFormula;
  }

  private buildSavedFormula(
    id: string,
    input: FormulationInput,
    formula: BeverageFormula,
  ): SavedBeverageFormula {
    const normalizedInput = this.normalizeFormulationInput(input);
    const normalizedFormula = this.validateAndNormalizeFormula(formula);
    const ingredientKeys = normalizedFormula.ingredients
      .slice(0, 5)
      .map((ingredient) => ingredient.rawMaterialKey)
      .join(', ');

    return {
      id,
      name: normalizedInput.drinkName,
      summary: `${normalizedInput.drinkName} for ${normalizedInput.marketDestination} at ${normalizedInput.targetBrix.toFixed(2)} Brix. Key materials: ${ingredientKeys}`,
      savedAt: new Date().toISOString(),
      formula: normalizedFormula,
      input: normalizedInput,
    };
  }

  private getSavedFormulas(): SavedBeverageFormula[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const rawValue = localStorage.getItem(this.savedFormulasStorageKey);
      return rawValue ? (JSON.parse(rawValue) as SavedBeverageFormula[]) : [];
    } catch {
      return [];
    }
  }

  private setSavedFormulas(savedFormulas: SavedBeverageFormula[]): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        this.savedFormulasStorageKey,
        JSON.stringify(savedFormulas),
      );
    }
  }

  private normalizeFormulationInput(input: FormulationInput): FormulationInput {
    return {
      ...input,
      drinkName: input.drinkName.trim(),
      marketDestination: input.marketDestination.trim(),
      targetBrix: Number(input.targetBrix),
      regionalRestrictions: input.regionalRestrictions
        .map((restriction) => restriction.trim())
        .filter(Boolean),
      productionArea: input.productionArea.trim(),
      customerSpecification: input.customerSpecification.trim(),
      baselineBOM: input.baselineBOM.trim(),
    };
  }

  private validateAndNormalizeFormula(
    formula: BeverageFormula,
  ): BeverageFormula {
    if (!Array.isArray(formula.ingredients)) {
      throw new Error(
        "Invalid formula: 'ingredients' field is missing or not an array.",
      );
    }

    const normalizedFormula: BeverageFormula = {
      ingredients: formula.ingredients.map((ingredient) => ({
        rawMaterialKey: `${ingredient.rawMaterialKey ?? ''}`.trim(),
        massPercentage: this.toNonNegativeNumber(ingredient.massPercentage),
        costProjection: this.toNonNegativeNumber(ingredient.costProjection),
      })),
      varianceAnalysis:
        typeof formula.varianceAnalysis === 'string'
          ? formula.varianceAnalysis
          : 'No variance analysis provided by the Gemini model.',
      stabilityAlerts: Array.isArray(formula.stabilityAlerts)
        ? formula.stabilityAlerts.map((alert) => `${alert ?? ''}`)
        : [],
    };
    const totalMass = normalizedFormula.ingredients.reduce(
      (sum, ingredient) => sum + ingredient.massPercentage,
      0,
    );

    if (Math.abs(totalMass - 100) > 0.5) {
      normalizedFormula.stabilityAlerts.push(
        `Warning: Ingredients total ${totalMass.toFixed(2)}%, not the required 100.0%.`,
      );
    }

    return normalizedFormula;
  }

  private toNonNegativeNumber(
    value: number | string | null | undefined,
  ): number {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue >= 0
      ? numericValue
      : 0;
  }
}
