import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { defer, forkJoin, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {
  AiModelSelection,
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
import {
  DEFAULT_CHAT_AI_MODEL,
  DEFAULT_DEMO_GEMINI_API_KEY,
  DEMO_GEMINI_API_KEY_STORAGE_KEY,
  chooseGeminiModel,
} from './ai-model-options';

type AiRequestMetadata = AiModelSelection & {
  aiProvider: AiModelSelection['provider'];
};

type AiFormulationRequest = FormulationInput & AiRequestMetadata;

type AiChatRequest = {
  message: string;
} & AiRequestMetadata;

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
  error?: {
    message?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class OllamaFormulationService {
  private readonly http = inject(HttpClient);
  private readonly demoSavedFormulasStorageKey = 'giavico_demo_saved_formulas';

  // Default microservice API endpoints.
  private readonly defaultCompleteApiUrl = `${GIAVICO_API_DOMAINS.formula}/generate`;
  private readonly defaultStreamApiUrl = `${GIAVICO_API_DOMAINS.formula}/generate/stream`;
  private readonly defaultFormulasApiUrl = GIAVICO_API_DOMAINS.formula;
  private readonly defaultChatApiUrl = GIAVICO_API_DOMAINS.chat;
  private readonly defaultChatStreamApiUrl = `${GIAVICO_API_DOMAINS.chat}/stream`;
  private readonly defaultChatMessagesApiUrl = `${GIAVICO_API_DOMAINS.chat}/messages`;
  private readonly defaultAccountOpenAiKeyStatusUrl = `${GIAVICO_API_DOMAINS.chat}/account/openai-key/status`;

  /**
   * Generates a structured beverage formula through the configured AI provider.
   *
   * @param input User-defined target conditions and operational constraints.
   * @param historicalData Optional historical formulation data (BOM structures) to anchor formulation changes.
   * @param model Override the default LLM model name.
   * @param apiUrl Override the default formula generation API URL.
   */
  public generateFormula(
    input: FormulationInput,
    historicalData?: string,
    model?: string,
    apiUrl: string = this.defaultCompleteApiUrl
  ): Observable<BeverageFormula> {
    const demoKey = this.getDemoGeminiApiKey();
    if (demoKey) {
      return this.generateFormulaWithDirectGemini(input, historicalData, model, demoKey);
    }

    return this.http.post<FormulaGenerationResponse>(apiUrl, this.buildApiRequest(input, historicalData, model)).pipe(
      map((response) => {
        try {
          return this.validateAndNormalizeFormula(response);
        } catch (error) {
          throw new Error(`Failed to normalize the Giavico API response as BeverageFormula: ${error instanceof Error ? error.message : String(error)}`);
        }
      })
    );
  }

  public storeFormula(
    input: FormulationInput,
    formula: BeverageFormula,
    apiUrl: string = this.defaultFormulasApiUrl
  ): Observable<SavedBeverageFormula> {
    if (this.getDemoGeminiApiKey()) {
      return defer(() => of(this.storeDemoSavedFormula(input, formula)));
    }

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
    if (this.getDemoGeminiApiKey()) {
      return of(this.getDemoSavedFormulas().slice(page * size, page * size + size));
    }

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
    if (this.getDemoGeminiApiKey()) {
      return defer(() => {
        const savedFormula = this.getDemoSavedFormulas().find((item) => item.id === id);

        if (!savedFormula) {
          throw new Error('Saved demo formula was not found in this browser.');
        }

        return of(savedFormula);
      });
    }

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
    if (this.getDemoGeminiApiKey()) {
      return defer(() => of(this.updateDemoSavedFormula(id, input, formula)));
    }

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
    if (this.getDemoGeminiApiKey()) {
      return defer(() => {
        this.setDemoSavedFormulas(this.getDemoSavedFormulas().filter((formula) => formula.id !== id));

        return of(undefined);
      });
    }

    return this.http.delete<void>(`${apiUrl}/${id}`);
  }

  public chat(
    message: string,
    model?: string,
    apiUrl: string = this.defaultChatApiUrl
  ): Observable<string> {
    const demoKey = this.getDemoGeminiApiKey();
    if (demoKey) {
      return this.chatWithDirectGemini(message, model, demoKey);
    }

    return this.http.post<{ message: string }>(apiUrl, this.buildChatRequest(message, model)).pipe(
      map((response) => response.message)
    );
  }

  public listChatMessages(
    page = 0,
    size = 100,
    apiUrl: string = this.defaultChatMessagesApiUrl
  ): Observable<ChatHistoryMessage[]> {
    if (this.getDemoGeminiApiKey()) {
      return of([]);
    }

    return this.http.get<ApiPage<ChatHistoryMessage>>(`${apiUrl}?page=${page}&size=${size}`).pipe(
      map((response) => response.content ?? [])
    );
  }

  public storeChatMessage(
    role: 'user' | 'assistant',
    content: string,
    apiUrl: string = this.defaultChatMessagesApiUrl
  ): Observable<ChatHistoryMessage> {
    if (this.getDemoGeminiApiKey()) {
      return of({
        id: `${Date.now()}`,
        role,
        content,
        createdAt: new Date().toISOString(),
      });
    }

    return this.http.post<ChatHistoryMessage>(apiUrl, { role, content });
  }

  public clearChatMessages(
    apiUrl: string = this.defaultChatMessagesApiUrl
  ): Observable<void> {
    if (this.getDemoGeminiApiKey()) {
      return of(undefined);
    }

    return this.http.delete<void>(apiUrl);
  }

  public getOpenAiKeyStatus(
    apiUrl: string = this.defaultAccountOpenAiKeyStatusUrl
  ): Observable<{ configured: boolean; provider: string; model: string }> {
    if (this.getDemoGeminiApiKey()) {
      return of({ configured: true, provider: 'gemini-direct-demo', model: DEFAULT_CHAT_AI_MODEL });
    }

    return this.http.get<{ configured: boolean; provider: string; model: string }>(apiUrl);
  }

  public chatStream(
    message: string,
    model?: string,
    apiUrl: string = this.defaultChatStreamApiUrl
  ): Observable<ChatStreamEvent> {
    const demoKey = this.getDemoGeminiApiKey();
    if (demoKey) {
      return this.chatWithDirectGemini(message, model, demoKey).pipe(
        map((response) => ({ type: 'complete', response } satisfies ChatStreamEvent))
      );
    }

    return new Observable<ChatStreamEvent>((observer) => {
      const controller = new AbortController();

      const streamChat = async (): Promise<void> => {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(this.buildChatRequest(message, model)),
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
    model?: string,
    apiUrl: string = this.defaultStreamApiUrl
  ): Observable<FormulationStreamEvent> {
    const demoKey = this.getDemoGeminiApiKey();
    if (demoKey) {
      return this.generateFormulaWithDirectGemini(input, historicalData, model, demoKey).pipe(
        map((formula) => ({ type: 'complete', formula } satisfies FormulationStreamEvent))
      );
    }

    return new Observable<FormulationStreamEvent>((observer) => {
      const controller = new AbortController();
      const requestPayload = this.buildApiRequest(input, historicalData, model);

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
          throw new Error('AI response did not include a readable stream.');
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

  private buildApiRequest(input: FormulationInput, historicalData?: string, model?: string): AiFormulationRequest {
    return {
      ...this.buildNormalizedFormulationInput(input, historicalData),
      ...this.buildAiRequestMetadata('formula', model),
    };
  }

  private buildChatRequest(message: string, model?: string): AiChatRequest {
    return {
      message,
      ...this.buildAiRequestMetadata('chat', model),
    };
  }

  private buildAiRequestMetadata(useCase: 'chat' | 'formula', model?: string): AiRequestMetadata {
    const selection = chooseGeminiModel(useCase, model);

    return {
      ...selection,
      aiProvider: selection.provider,
    };
  }

  private chatWithDirectGemini(message: string, model: string | undefined, apiKey: string): Observable<string> {
    return defer(() =>
      this.callGeminiGenerateContent(
        model,
        `You are Giavico AI, an R&D beverage formulation assistant. Answer clearly and practically about formulation, stability, Brix, cost, regulations, and process constraints.\n\nUser question:\n${message}`,
        apiKey
      )
    );
  }

  private generateFormulaWithDirectGemini(
    input: FormulationInput,
    historicalData: string | undefined,
    model: string | undefined,
    apiKey: string
  ): Observable<BeverageFormula> {
    const normalizedInput = this.buildNormalizedFormulationInput(input);
    const prompt = this.constructUserPrompt(normalizedInput, historicalData);

    return defer(() =>
      this.callGeminiGenerateContent(model, prompt, apiKey, this.constructSystemPrompt(), 'application/json')
        .then((responseText) => {
          const formula = JSON.parse(this.extractJsonObject(responseText)) as BeverageFormula;

          return this.validateAndNormalizeFormula(formula);
        })
        .catch((error) => {
          throw new Error(`Gemini formula generation failed: ${error instanceof Error ? error.message : String(error)}`);
        })
    );
  }

  private async callGeminiGenerateContent(
    model: string | undefined,
    prompt: string,
    apiKey: string,
    systemPrompt?: string,
    responseMimeType?: 'application/json'
  ): Promise<string> {
    const selection = chooseGeminiModel(responseMimeType === 'application/json' ? 'formula' : 'chat', model);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(selection.model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
          generationConfig: {
            temperature: responseMimeType === 'application/json' ? 0.2 : 0.45,
            ...(responseMimeType ? { responseMimeType } : {}),
          },
        }),
      }
    );

    const payload = await response.json().catch(() => null) as GeminiGenerateContentResponse | null;
    if (!response.ok) {
      throw new Error(payload?.error?.message ?? `Gemini request failed with status ${response.status}.`);
    }

    const text = payload?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim();

    if (!text) {
      throw new Error(payload?.promptFeedback?.blockReason
        ? `Gemini blocked the response: ${payload.promptFeedback.blockReason}.`
        : 'Gemini returned an empty response.');
    }

    return text;
  }

  private getDemoGeminiApiKey(): string {
    if (typeof localStorage === 'undefined') {
      return DEFAULT_DEMO_GEMINI_API_KEY.trim();
    }

    return (localStorage.getItem(DEMO_GEMINI_API_KEY_STORAGE_KEY) ?? DEFAULT_DEMO_GEMINI_API_KEY).trim();
  }

  private extractJsonObject(value: string): string {
    const trimmedValue = value
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
    const startIndex = trimmedValue.indexOf('{');
    const endIndex = trimmedValue.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      throw new Error('Gemini did not return a JSON object.');
    }

    return trimmedValue.slice(startIndex, endIndex + 1);
  }

  private buildNormalizedFormulationInput(input: FormulationInput, historicalData?: string): FormulationInput {
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
    const normalizedInput = this.buildNormalizedFormulationInput(input);
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

  private storeDemoSavedFormula(input: FormulationInput, formula: BeverageFormula): SavedBeverageFormula {
    const normalizedFormula = this.validateAndNormalizeFormula(formula);
    const normalizedInput = this.buildNormalizedFormulationInput(input);
    const savedFormula: SavedBeverageFormula = {
      id: `demo-${Date.now()}`,
      name: normalizedInput.drinkName,
      summary: this.buildFallbackSummary(normalizedInput, normalizedFormula),
      savedAt: new Date().toISOString(),
      formula: normalizedFormula,
      input: normalizedInput,
    };

    this.setDemoSavedFormulas([savedFormula, ...this.getDemoSavedFormulas()]);

    return savedFormula;
  }

  private updateDemoSavedFormula(
    id: string,
    input: FormulationInput,
    formula: BeverageFormula
  ): SavedBeverageFormula {
    const normalizedFormula = this.validateAndNormalizeFormula(formula);
    const normalizedInput = this.buildNormalizedFormulationInput(input);
    const savedFormula: SavedBeverageFormula = {
      id,
      name: normalizedInput.drinkName,
      summary: this.buildFallbackSummary(normalizedInput, normalizedFormula),
      savedAt: new Date().toISOString(),
      formula: normalizedFormula,
      input: normalizedInput,
    };
    const savedFormulas = this.getDemoSavedFormulas();

    this.setDemoSavedFormulas([
      savedFormula,
      ...savedFormulas.filter((item) => item.id !== id),
    ]);

    return savedFormula;
  }

  private getDemoSavedFormulas(): SavedBeverageFormula[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const rawValue = localStorage.getItem(this.demoSavedFormulasStorageKey);

      return rawValue ? JSON.parse(rawValue) as SavedBeverageFormula[] : [];
    } catch {
      return [];
    }
  }

  private setDemoSavedFormulas(savedFormulas: SavedBeverageFormula[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.demoSavedFormulasStorageKey, JSON.stringify(savedFormulas));
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
      throw new Error(data || 'Giavico API returned a formula streaming error.');
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
      throw new Error(data || 'Giavico API returned a chatbot streaming error.');
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
      throw new Error(`Failed to parse the streamed Giavico API response as BeverageFormula JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Constructs a system prompt establishing the AI role, expected constraints, and output format.
   */
  private constructSystemPrompt(): string {
    return `You are an expert Dashboard Food Scientist and Industrial Formulation Engineer (Giavico Specs).
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
