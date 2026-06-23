import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { defer, forkJoin, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {
  ApiPage,
  BeverageFormula,
  ChatHistoryMessage,
  ChatStreamEvent,
  FormulaDetailResponse,
  FormulaGenerationResponse,
  FormulaListItem,
  FormulationInput,
  FormulationStreamEvent,
  SavedBeverageFormula,
} from '../models/formulation.model';
import { GIAVICO_API_DOMAINS } from '../../../core/config/giavico-api-domains';

@Injectable({
  providedIn: 'root',
})
export class OllamaFormulationService {
  private readonly http = inject(HttpClient);

  // Default microservice API endpoints.
  private readonly defaultCompleteApiUrl = `${GIAVICO_API_DOMAINS.formula}/generate`;
  private readonly defaultStreamApiUrl = `${GIAVICO_API_DOMAINS.formula}/generate/stream`;
  private readonly defaultFormulasApiUrl = GIAVICO_API_DOMAINS.formula;
  private readonly defaultChatApiUrl = GIAVICO_API_DOMAINS.chat;
  private readonly defaultChatStreamApiUrl = `${GIAVICO_API_DOMAINS.chat}/stream`;
  private readonly defaultChatMessagesApiUrl = `${GIAVICO_API_DOMAINS.chat}/messages`;

  /**
   * Generates a structured beverage formula by compiling parameters and sending the payload to Ollama.
   *
   * @param input User-defined target conditions and operational constraints.
   * @param historicalData Optional historical formulation data (BOM structures) to anchor formulation changes.
   * @param model Override the default LLM model name.
   * @param apiUrl Override the default Ollama API URL.
   */
  public generateFormula(
    input: FormulationInput,
    historicalData?: string,
    _model?: string,
    apiUrl: string = this.defaultCompleteApiUrl
  ): Observable<BeverageFormula> {
    return this.http.post<FormulaGenerationResponse>(apiUrl, this.buildApiRequest(input, historicalData)).pipe(
      map((response) => {
        try {
          return this.validateAndNormalizeFormula(response);
        } catch (error) {
          throw new Error(`Failed to normalize formula-service response as BeverageFormula: ${error instanceof Error ? error.message : String(error)}`);
        }
      })
    );
  }

  public storeFormula(
    input: FormulationInput,
    formula: BeverageFormula,
    apiUrl: string = this.defaultFormulasApiUrl
  ): Observable<SavedBeverageFormula> {
    return defer(() =>
      this.http.post<FormulaGenerationResponse>(apiUrl, this.buildStoreRequest(input, formula)).pipe(
        map((response) => this.mapGenerationResponseToSavedFormula(input, response))
      )
    );
  }

  public listSavedFormulas(
    page = 0,
    size = 20,
    apiUrl: string = this.defaultFormulasApiUrl
  ): Observable<SavedBeverageFormula[]> {
    return this.http.get<ApiPage<FormulaListItem>>(`${apiUrl}?page=${page}&size=${size}`).pipe(
      switchMap((response) => {
        const items = response.content ?? [];

        if (items.length === 0) {
          return of([]);
        }

        return forkJoin(items.map((item) => this.getSavedFormula(item.uuid, apiUrl)));
      })
    );
  }

  public getSavedFormula(
    id: string,
    apiUrl: string = this.defaultFormulasApiUrl
  ): Observable<SavedBeverageFormula> {
    return this.http.get<FormulaDetailResponse>(`${apiUrl}/${id}`).pipe(
      map((response) => this.mapDetailResponseToSavedFormula(response))
    );
  }

  public updateSavedFormula(
    id: string,
    input: FormulationInput,
    formula: BeverageFormula,
    apiUrl: string = this.defaultFormulasApiUrl
  ): Observable<SavedBeverageFormula> {
    return defer(() =>
      this.http.put<FormulaDetailResponse>(`${apiUrl}/${id}`, this.buildStoreRequest(input, formula)).pipe(
        map((response) => this.mapDetailResponseToSavedFormula(response))
      )
    );
  }

  public deleteSavedFormula(
    id: string,
    apiUrl: string = this.defaultFormulasApiUrl
  ): Observable<void> {
    return this.http.delete<void>(`${apiUrl}/${id}`);
  }

  public chat(
    message: string,
    apiUrl: string = this.defaultChatApiUrl
  ): Observable<string> {
    return this.http.post<{ message: string }>(apiUrl, { message }).pipe(
      map((response) => response.message)
    );
  }

  public listChatMessages(
    page = 0,
    size = 100,
    apiUrl: string = this.defaultChatMessagesApiUrl
  ): Observable<ChatHistoryMessage[]> {
    return this.http.get<ApiPage<ChatHistoryMessage>>(`${apiUrl}?page=${page}&size=${size}`).pipe(
      map((response) => response.content ?? [])
    );
  }

  public storeChatMessage(
    role: 'user' | 'assistant',
    content: string,
    apiUrl: string = this.defaultChatMessagesApiUrl
  ): Observable<ChatHistoryMessage> {
    return this.http.post<ChatHistoryMessage>(apiUrl, { role, content });
  }

  public clearChatMessages(
    apiUrl: string = this.defaultChatMessagesApiUrl
  ): Observable<void> {
    return this.http.delete<void>(apiUrl);
  }

  public chatStream(
    message: string,
    apiUrl: string = this.defaultChatStreamApiUrl
  ): Observable<ChatStreamEvent> {
    return new Observable<ChatStreamEvent>((observer) => {
      const controller = new AbortController();

      const streamChat = async (): Promise<void> => {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw await this.buildFetchError(response, 'Chat request failed');
        }

        if (!response.body) {
          throw new Error('Chat response did not include a readable stream.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let pendingEvent = '';
        let fullResponse = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          pendingEvent += decoder.decode(value, { stream: true });
          const events = pendingEvent.split(/\r?\n\r?\n/);
          pendingEvent = events.pop() ?? '';

          for (const eventText of events) {
            const nextResponse = this.processChatServerSentEvent(eventText, fullResponse, observer);
            if (nextResponse === null) {
              observer.next({ type: 'complete', response: fullResponse });
              observer.complete();
              return;
            }
            fullResponse = nextResponse;
          }
        }

        const finalEvent = pendingEvent + decoder.decode();
        if (finalEvent.trim()) {
          const nextResponse = this.processChatServerSentEvent(finalEvent, fullResponse, observer);
          if (nextResponse === null) {
            observer.next({ type: 'complete', response: fullResponse });
            observer.complete();
            return;
          }
          fullResponse = nextResponse;
        }

        observer.next({ type: 'complete', response: fullResponse });
        observer.complete();
      };

      streamChat().catch((error) => {
        if (!controller.signal.aborted) {
          observer.error(error);
        }
      });

      return () => controller.abort();
    });
  }

  public generateFormulaStream(
    input: FormulationInput,
    historicalData?: string,
    _model?: string,
    apiUrl: string = this.defaultStreamApiUrl
  ): Observable<FormulationStreamEvent> {
    return new Observable<FormulationStreamEvent>((observer) => {
      const controller = new AbortController();
      const requestPayload = this.buildApiRequest(input, historicalData);

      const streamFormula = async (): Promise<void> => {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw await this.buildFetchError(response, 'Formula generation request failed');
        }

        if (!response.body) {
          throw new Error('Ollama response did not include a readable stream.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let pendingEvent = '';
        let fullResponse = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          pendingEvent += decoder.decode(value, { stream: true });
          const events = pendingEvent.split(/\r?\n\r?\n/);
          pendingEvent = events.pop() ?? '';

          for (const eventText of events) {
            const nextResponse = this.processServerSentEvent(eventText, fullResponse, observer);
            if (nextResponse === null) {
              this.emitCompleteFormula(fullResponse, observer);
              return;
            }
            fullResponse = nextResponse;
          }
        }

        const finalEvent = pendingEvent + decoder.decode();
        if (finalEvent.trim()) {
          const nextResponse = this.processServerSentEvent(finalEvent, fullResponse, observer);
          if (nextResponse === null) {
            this.emitCompleteFormula(fullResponse, observer);
            return;
          }
          fullResponse = nextResponse;
        }

        this.emitCompleteFormula(fullResponse, observer);
      };

      streamFormula().catch((error) => {
        if (!controller.signal.aborted) {
          observer.error(error);
        }
      });

      return () => controller.abort();
    });
  }

  private buildApiRequest(input: FormulationInput, historicalData?: string): FormulationInput {
    return {
      ...input,
      drinkName: input.drinkName.trim(),
      marketDestination: input.marketDestination.trim(),
      targetBrix: Number(input.targetBrix),
      regionalRestrictions: input.regionalRestrictions.map((restriction) => restriction.trim()).filter(Boolean),
      productionArea: input.productionArea.trim(),
      customerSpecification: historicalData
        ? `${input.customerSpecification.trim()}\n\nHistorical formulation context:\n${historicalData}`
        : input.customerSpecification.trim(),
      baselineBOM: input.baselineBOM.trim(),
    };
  }

  private buildStoreRequest(input: FormulationInput, formula: BeverageFormula): FormulationInput & BeverageFormula {
    const normalizedInput = this.buildApiRequest(input);
    const normalizedFormula = this.validateAndNormalizeFormula(formula);
    const ingredients = normalizedFormula.ingredients
      .map((ingredient) => ({
        rawMaterialKey: `${ingredient.rawMaterialKey ?? ''}`.trim(),
        massPercentage: this.toNonNegativeNumber(ingredient.massPercentage),
        costProjection: this.toNonNegativeNumber(ingredient.costProjection),
      }))
      .filter((ingredient) =>
        ingredient.rawMaterialKey.length > 0
      );

    if (ingredients.length === 0) {
      throw new Error('Cannot save formula because it does not include any valid ingredients.');
    }

    return {
      ...normalizedInput,
      ingredients,
      varianceAnalysis: normalizedFormula.varianceAnalysis.trim(),
      stabilityAlerts: normalizedFormula.stabilityAlerts
        .map((alert) => `${alert ?? ''}`.trim())
        .filter(Boolean),
    };
  }

  private toNonNegativeNumber(value: number | string | null | undefined): number {
    const numericValue = Number(value);

    return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
  }

  private mapGenerationResponseToSavedFormula(
    input: FormulationInput,
    response: FormulaGenerationResponse
  ): SavedBeverageFormula {
    const metadata = response.savedFormula;
    const formula = this.validateAndNormalizeFormula(response);

    return {
      id: metadata?.uuid ?? `${Date.now()}`,
      name: metadata?.name ?? input.drinkName,
      summary: metadata?.summary ?? this.buildFallbackSummary(input, formula),
      savedAt: metadata?.timestamp ?? new Date().toISOString(),
      formula,
      input,
    };
  }

  private mapDetailResponseToSavedFormula(response: FormulaDetailResponse): SavedBeverageFormula {
    const input: FormulationInput = {
      drinkName: response.name,
      marketDestination: response.marketDestination,
      targetBrix: response.targetBrix,
      isAcidified: response.isAcidified,
      regionalRestrictions: response.regionalRestrictions ?? [],
      productionArea: response.productionArea,
      customerSpecification: response.customerSpecification,
      baselineBOM: response.baselineBOM,
    };

    return {
      id: response.uuid,
      name: response.name,
      summary: response.summary,
      savedAt: response.timestamp,
      formula: this.validateAndNormalizeFormula({
        ingredients: response.ingredients,
        varianceAnalysis: response.varianceAnalysis,
        stabilityAlerts: response.stabilityAlerts,
      }),
      input,
    };
  }

  private buildFallbackSummary(input: FormulationInput, formula: BeverageFormula): string {
    const ingredientKeys = formula.ingredients
      .slice(0, 5)
      .map((ingredient) => ingredient.rawMaterialKey)
      .join(', ');

    return `${input.drinkName} for ${input.marketDestination} at ${input.targetBrix.toFixed(2)} Brix. Key materials: ${ingredientKeys}`;
  }

  private processServerSentEvent(
    eventText: string,
    currentResponse: string,
    observer: { next: (value: FormulationStreamEvent) => void }
  ): string | null {
    const trimmedEvent = eventText.trim();

    if (!trimmedEvent) {
      return currentResponse;
    }

    const { event, data } = this.parseServerSentEvent(eventText);

    if (event === 'complete' || data === '[DONE]') {
      return null;
    }

    if (event === 'ollama-error' || event === 'stream-parse-error') {
      throw new Error(data || 'formula-service returned a streaming error.');
    }

    const nextResponse = currentResponse + data;

    if (data) {
      observer.next({
        type: 'progress',
        partialResponse: nextResponse,
      });
    }

    return nextResponse;
  }

  private processChatServerSentEvent(
    eventText: string,
    currentResponse: string,
    observer: { next: (value: ChatStreamEvent) => void }
  ): string | null {
    const trimmedEvent = eventText.trim();

    if (!trimmedEvent) {
      return currentResponse;
    }

    const { event, data } = this.parseServerSentEvent(eventText, true);

    if (event === 'complete' || data === '[DONE]') {
      return null;
    }

    if (event === 'ollama-error' || event === 'stream-parse-error') {
      throw new Error(data || 'chat-ai-service returned a chatbot streaming error.');
    }

    const nextResponse = currentResponse + this.getChatChunkSeparator(currentResponse, data) + data;

    if (data) {
      observer.next({
        type: 'progress',
        partialResponse: nextResponse,
      });
    }

    return nextResponse;
  }

  private parseServerSentEvent(eventText: string, preserveDataSpacing = false): { event: string; data: string } {
    const lines = eventText.split(/\r?\n/);
    const event = lines
      .find((line) => line.startsWith('event:'))
      ?.slice('event:'.length)
      .trim() ?? 'message';
    const data = lines
      .filter((line) => line.startsWith('data:'))
      .map((line) => this.parseServerSentEventDataLine(line, preserveDataSpacing))
      .join('\n');

    return { event, data };
  }

  private parseServerSentEventDataLine(line: string, preserveDataSpacing: boolean): string {
    const value = line.slice('data:'.length);

    if (preserveDataSpacing) {
      return value;
    }

    return value.startsWith(' ') ? value.slice(1) : value;
  }

  private async buildFetchError(response: Response, fallbackMessage: string): Promise<Error> {
    const body = await response.text().catch(() => '');
    const message = this.extractErrorMessage(body)
      ?? body.trim()
      ?? `${fallbackMessage} with status ${response.status}.`;

    return new Error(message);
  }

  private extractErrorMessage(body: string): string | null {
    if (!body.trim()) {
      return null;
    }

    try {
      const parsed = JSON.parse(body) as { message?: unknown; error?: unknown };
      if (typeof parsed.message === 'string' && parsed.message.trim()) {
        return parsed.message.trim();
      }
      if (typeof parsed.error === 'string' && parsed.error.trim()) {
        return parsed.error.trim();
      }
    } catch {
      return null;
    }

    return null;
  }

  private getChatChunkSeparator(currentResponse: string, chunk: string): string {
    if (!currentResponse || !chunk || /^\s/.test(chunk) || /\s$/.test(currentResponse)) {
      return '';
    }

    const lastChar = currentResponse.at(-1) ?? '';
    const firstChar = chunk.at(0) ?? '';

    return /[.!?:;,)]/.test(lastChar) && /[A-Za-z0-9]/.test(firstChar) ? ' ' : '';
  }

  private emitCompleteFormula(
    responseJson: string,
    observer: {
      next: (value: FormulationStreamEvent) => void;
      complete: () => void;
    }
  ): void {
    try {
      const formula: BeverageFormula = JSON.parse(responseJson);
      observer.next({
        type: 'complete',
        formula: this.validateAndNormalizeFormula(formula),
      });
      observer.complete();
    } catch (error) {
      throw new Error(`Failed to parse streamed formula-service response as BeverageFormula JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Constructs a system prompt establishing the AI role, expected constraints, and output format.
   */
  private constructSystemPrompt(): string {
    return `You are an expert Beverage R&D Food Scientist and Industrial Formulation Engineer (Giavico Specs).
Your task is to generate a structured beverage recipe formulation (JSON format) that satisfies user-defined targets and operational constraints.

You MUST follow these strict food science and formulation constraints:
1. Ingredients Mass Percentage: The sum of mass percentages of all ingredients MUST equal exactly 100.0%.
2. Acidity Control: If the formulation requires Acidification (pH < 4.6), ensure proper acidulants (e.g., Citric Acid, Malic Acid) are formulated to reach microbiological stability.
3. Cost Projections: Estimate cost projections per raw material based on typical commodity pricing.
4. Output Schema: You must output a JSON object matching this schema exactly:
{
  "ingredients": [
    { "rawMaterialKey": "string", "massPercentage": number, "costProjection": number }
  ],
  "varianceAnalysis": "string (markdown formatted explaining differences against the baseline BOM, swaps justification, and sensory impact)",
  "stabilityAlerts": [
    "string (safety alerts, thermal process vulnerabilities, or regulatory warnings)"
  ]
}

Ensure your response is valid JSON only. Do not wrap the JSON output in markdown code blocks.`;
  }

  /**
   * Builds the contextual user prompt by combining input parameters and historical baseline BOMs.
   */
  private constructUserPrompt(input: FormulationInput, historicalData?: string): string {
    let prompt = `Generate a beverage formulation based on the following target parameters and operational constraints:

### Target Parameters:
- Drink Name: ${input.drinkName}
- Market Destination: ${input.marketDestination}
- Target Brix (°Bx): ${input.targetBrix} °Bx
- Acidification Status (pH < 4.6): ${input.isAcidified ? 'REQUIRED (pH must be < 4.6 for hot fill or preservation)' : 'NOT REQUIRED'}
- Regional Regulatory Restrictions: ${input.regionalRestrictions.length ? input.regionalRestrictions.join(', ') : 'None specified'}`;

    prompt += `

### Operational Constraints:
- Production Area / Facility: ${input.productionArea}
- Customer Specifications: ${input.customerSpecification}
- Baseline Bill of Materials (BOM): ${input.baselineBOM}`;

    if (historicalData) {
      prompt += `

### Historical Formulation Matrix & Performance Data:
${historicalData}

Please merge the target conditions with this historical data matrix. Adjust the baseline BOM ratios to meet the new target Brix, acidification, and regional restrictions while maintaining taste harmony and factory constraints.`;
    } else {
      prompt += `

Please establish the recipe ratios from scratch to satisfy the targets above using industry-standard base formulations.`;
    }

    return prompt;
  }

  /**
   * Helper method to validate and clean up raw responses (e.g. enforcing key validation or sanitizing numbers).
   */
  private validateAndNormalizeFormula(formula: BeverageFormula): BeverageFormula {
    if (!formula.ingredients || !Array.isArray(formula.ingredients)) {
      throw new Error("Invalid formula: 'ingredients' field is missing or not an array.");
    }
    const normalizedFormula: BeverageFormula = {
      ingredients: formula.ingredients.map((ingredient) => ({
        rawMaterialKey: `${ingredient.rawMaterialKey ?? ''}`.trim(),
        massPercentage: this.toNonNegativeNumber(ingredient.massPercentage),
        costProjection: this.toNonNegativeNumber(ingredient.costProjection),
      })),
      varianceAnalysis: typeof formula.varianceAnalysis === 'string'
        ? formula.varianceAnalysis
        : 'No variance analysis provided by the LLM model.',
      stabilityAlerts: Array.isArray(formula.stabilityAlerts)
        ? formula.stabilityAlerts.map((alert) => `${alert ?? ''}`)
        : [],
    };

    // Verify mass percentage total
    const totalMass = normalizedFormula.ingredients.reduce((sum, item) => sum + item.massPercentage, 0);
    if (Math.abs(totalMass - 100) > 0.5) {
      normalizedFormula.stabilityAlerts.push(
        `Warning: Ingredients mass percentages total ${totalMass.toFixed(2)}%, which deviates from the required 100.0%. Please check mass balance.`
      );
    }

    return normalizedFormula;
  }
}
