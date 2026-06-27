import { AiModelOption, AiModelSelection, AiModelUseCase } from '../models/formulation.model';

export const DEFAULT_CHAT_AI_MODEL = 'gemini-3.5-flash';
export const DEFAULT_FORMULA_AI_MODEL = 'gemini-3.1-flash-lite';
export const DEMO_GEMINI_API_KEY_STORAGE_KEY = 'giavico_demo_gemini_api_key';
export const DEFAULT_DEMO_GEMINI_API_KEY = 'AIzaSyDX3RcJAPHsivcZLye3plBgkrFS08cjz2s';

export const GEMINI_AI_MODEL_OPTIONS: AiModelOption[] = [
  {
    provider: 'gemini',
    model: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash',
    description: 'Balanced chat quality for formulation support and troubleshooting.',
    recommendedFor: ['chat', 'formula'],
  },
  {
    provider: 'gemini',
    model: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash-Lite',
    description: 'Fast lightweight option for structured formula generation.',
    recommendedFor: ['formula'],
  },
  {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'Reliable fallback model for chat or formula drafts.',
    recommendedFor: ['chat', 'formula'],
  },
];

export function chooseGeminiModel(useCase: AiModelUseCase, requestedModel?: string): AiModelSelection {
  const normalizedModel = requestedModel?.trim();
  const requestedOption = normalizedModel
    ? GEMINI_AI_MODEL_OPTIONS.find((option) => option.model === normalizedModel)
    : undefined;

  if (requestedOption) {
    return {
      provider: requestedOption.provider,
      model: requestedOption.model,
    };
  }

  return {
    provider: 'gemini',
    model: useCase === 'chat' ? DEFAULT_CHAT_AI_MODEL : DEFAULT_FORMULA_AI_MODEL,
  };
}
