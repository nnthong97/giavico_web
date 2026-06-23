export interface BeverageFormulaIngredient {
  rawMaterialKey: string;
  massPercentage: number; // Sum of all mass percentages must equal 100%
  costProjection: number;
}

export interface BeverageFormula {
  ingredients: BeverageFormulaIngredient[];
  varianceAnalysis: string; // Markdown formatted string comparing against baseline BOM
  stabilityAlerts: string[]; // Safety alerts, thermal calculation warnings, regulatory warnings
}

export type FormulationStreamEvent =
  | { type: 'progress'; partialResponse: string }
  | { type: 'complete'; formula: BeverageFormula };

export type ChatStreamEvent =
  | { type: 'progress'; partialResponse: string }
  | { type: 'complete'; response: string };

export interface ChatHistoryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface SavedBeverageFormula {
  id: string;
  name: string;
  summary: string;
  savedAt: string;
  formula: BeverageFormula;
  input?: FormulationInput;
}

export interface FormulaGenerationResponse extends BeverageFormula {
  savedFormula?: {
    uuid: string;
    name: string;
    summary: string;
    timestamp: string;
  } | null;
}

export interface FormulaListItem {
  uuid: string;
  name: string;
  marketDestination: string;
  targetBrix: number;
  isAcidified: boolean;
  productionArea: string;
  baselineBOM: string;
  summary: string;
  timestamp: string;
  ingredientCount: number;
  alertCount: number;
}

export interface FormulaDetailResponse extends FormulationInput, BeverageFormula {
  uuid: string;
  name: string;
  summary: string;
  timestamp: string;
}

export interface ApiPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface FormulationInput {
  drinkName: string;

  // Target Parameters
  marketDestination: string;
  targetBrix: number;         // Target Brix (°Bx)
  isAcidified: boolean;       // Acidification Status (pH < 4.6)
  regionalRestrictions: string[];

  // Operational Constraints
  productionArea: string;
  customerSpecification: string;
  baselineBOM: string;        // ID or description of baseline recipe structure/matrix
}

export interface OllamaRequest {
  model: string;
  prompt: string;
  system?: string;
  format: 'json';
  stream: boolean;
  options?: {
    temperature?: number;
    timeout?: number;
    [key: string]: any;
  };
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string; // The JSON string representing the BeverageFormula response
  done: boolean;
  done_reason?: string;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}
