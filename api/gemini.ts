import type { IncomingMessage, ServerResponse } from 'node:http';

export const config = {
  maxDuration: 60,
};

type ApiRequest = IncomingMessage & {
  body?: unknown;
};

type ApiResponse = ServerResponse & {
  status(code: number): ApiResponse;
  json(value: unknown): void;
};

interface FormulationInput {
  drinkName: string;
  marketDestination: string;
  targetBrix: number;
  isAcidified: boolean;
  regionalRestrictions: string[];
  productionArea: string;
  customerSpecification: string;
  baselineBOM: string;
}

interface GeminiRequest {
  useCase?: 'chat' | 'formula';
  model?: string;
  message?: string;
  input?: FormulationInput;
  historicalData?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
  error?: {
    message?: string;
  };
}

const ALLOWED_MODELS = new Set([
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
]);

const FORMULA_SYSTEM_PROMPT = `You are an expert food scientist and industrial beverage formulation engineer working to Giavico specifications.
Generate a structured beverage recipe that satisfies the supplied targets and operational constraints.

Follow these requirements:
1. Ingredient mass percentages must total exactly 100.0%.
2. If acidification is required, include suitable acidulants for a target pH below 4.6.
3. Estimate each raw material cost projection using typical commodity pricing.
4. Return only a JSON object matching this schema:
{
  "ingredients": [
    { "rawMaterialKey": "string", "massPercentage": number, "costProjection": number }
  ],
  "varianceAnalysis": "string",
  "stabilityAlerts": ["string"]
}`;

const CHAT_SYSTEM_PROMPT = `You are Giavico AI, an R&D beverage formulation assistant.
Answer clearly and practically about formulation, stability, Brix, cost, regulations, and process constraints.`;

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
): Promise<void> {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method === 'POST' && !isSameOriginRequest(request)) {
    response
      .status(403)
      .json({ message: 'Cross-origin Gemini requests are not allowed.' });
    return;
  }

  const requestApiKey = getRequestApiKey(request);
  const apiKey =
    requestApiKey || normalizeApiKey(process.env['GEMINI_API_KEY']);

  if (request.method === 'GET') {
    const keyStatus = await validateGeminiApiKey(apiKey);
    response.status(200).json({
      configured: keyStatus.valid,
      provider: 'gemini-vercel',
      model: 'Selectable per request',
      ...(keyStatus.message ? { message: keyStatus.message } : {}),
    });
    return;
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST');
    response.status(405).json({ message: 'Method not allowed.' });
    return;
  }

  if (!apiKey) {
    response.status(503).json({
      message:
        'Gemini is not configured. Add GEMINI_API_KEY to the Vercel project environment variables and redeploy.',
    });
    return;
  }

  if (!isGeminiApiKey(apiKey)) {
    response.status(503).json({
      message:
        'GEMINI_API_KEY is not a recognized Gemini key format. Paste only the AQ. or AIza key value, without quotes or GEMINI_API_KEY=.',
    });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const model = normalizeModel(body.model);
    const { prompt, systemPrompt, responseMimeType } = buildPrompt(body);
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: responseMimeType ? 0.2 : 0.45,
            ...(responseMimeType ? { responseMimeType } : {}),
          },
        }),
      },
    );
    const payload = (await geminiResponse
      .json()
      .catch(() => null)) as GeminiResponse | null;

    if (!geminiResponse.ok) {
      response.status(geminiResponse.status).json({
        message:
          geminiResponse.status === 401
            ? 'Google rejected the Gemini API key. Create a new key in Google AI Studio, paste only its AQ. or AIza value, and try again.'
            : (payload?.error?.message ??
              `Gemini request failed with status ${geminiResponse.status}.`),
      });
      return;
    }

    const generatedText = payload?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim();

    if (!generatedText) {
      response.status(502).json({
        message: payload?.promptFeedback?.blockReason
          ? `Gemini blocked the response: ${payload.promptFeedback.blockReason}.`
          : 'Gemini returned an empty response.',
      });
      return;
    }

    if (body.useCase === 'formula') {
      response.status(200).json(JSON.parse(extractJsonObject(generatedText)));
      return;
    }

    response.status(200).json({ message: generatedText });
  } catch (error) {
    response.status(400).json({
      message:
        error instanceof Error ? error.message : 'Invalid Gemini request.',
    });
  }
}

function buildPrompt(body: GeminiRequest): {
  prompt: string;
  systemPrompt: string;
  responseMimeType?: 'application/json';
} {
  if (body.useCase === 'chat') {
    const message = requiredString(body.message, 'Chat message', 8_000);

    return {
      prompt: message,
      systemPrompt: CHAT_SYSTEM_PROMPT,
    };
  }

  if (body.useCase !== 'formula' || !body.input) {
    throw new Error('A valid chat or formula request is required.');
  }

  const input = normalizeFormulationInput(body.input);
  const restrictions = input.regionalRestrictions.length
    ? input.regionalRestrictions.join(', ')
    : 'None specified';
  const historicalData = optionalString(body.historicalData, 12_000);
  const historicalSection = historicalData
    ? `\n\nHistorical formulation data:\n${historicalData}\n\nAdjust the baseline ratios using this context.`
    : '\n\nEstablish suitable ratios using industry-standard beverage formulations.';

  return {
    systemPrompt: FORMULA_SYSTEM_PROMPT,
    responseMimeType: 'application/json',
    prompt: `Generate a beverage formulation with these parameters:
- Drink name: ${input.drinkName}
- Market destination: ${input.marketDestination}
- Target Brix: ${input.targetBrix}
- Acidification below pH 4.6: ${input.isAcidified ? 'Required' : 'Not required'}
- Regional restrictions: ${restrictions}
- Production area: ${input.productionArea}
- Customer specification: ${input.customerSpecification}
- Baseline BOM: ${input.baselineBOM}${historicalSection}`,
  };
}

function normalizeFormulationInput(input: FormulationInput): FormulationInput {
  const targetBrix = Number(input.targetBrix);
  if (!Number.isFinite(targetBrix) || targetBrix < 0 || targetBrix > 100) {
    throw new Error('Target Brix must be a number between 0 and 100.');
  }

  return {
    drinkName: requiredString(input.drinkName, 'Drink name', 200),
    marketDestination: requiredString(
      input.marketDestination,
      'Market destination',
      200,
    ),
    targetBrix,
    isAcidified: Boolean(input.isAcidified),
    regionalRestrictions: Array.isArray(input.regionalRestrictions)
      ? input.regionalRestrictions
          .slice(0, 20)
          .map((value) => optionalString(value, 200))
          .filter(Boolean)
      : [],
    productionArea: optionalString(input.productionArea, 500),
    customerSpecification: optionalString(input.customerSpecification, 4_000),
    baselineBOM: optionalString(input.baselineBOM, 4_000),
  };
}

function normalizeModel(model: unknown): string {
  const normalizedModel = typeof model === 'string' ? model.trim() : '';
  if (!ALLOWED_MODELS.has(normalizedModel)) {
    throw new Error('The selected Gemini model is not supported.');
  }

  return normalizedModel;
}

async function readJsonBody(request: ApiRequest): Promise<GeminiRequest> {
  if (request.body && typeof request.body === 'object') {
    return request.body as GeminiRequest;
  }

  if (typeof request.body === 'string') {
    return JSON.parse(request.body) as GeminiRequest;
  }

  const chunks: Buffer[] = [];
  let byteLength = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteLength += buffer.length;
    if (byteLength > 32_000) {
      throw new Error('Gemini request payload is too large.');
    }
    chunks.push(buffer);
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as GeminiRequest;
}

function extractJsonObject(value: string): string {
  const trimmedValue = value
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  const startIndex = trimmedValue.indexOf('{');
  const endIndex = trimmedValue.lastIndexOf('}');

  if (startIndex === -1 || endIndex <= startIndex) {
    throw new Error('Gemini did not return a valid formula JSON object.');
  }

  return trimmedValue.slice(startIndex, endIndex + 1);
}

function requiredString(
  value: unknown,
  label: string,
  maxLength: number,
): string {
  const normalizedValue = optionalString(value, maxLength);
  if (!normalizedValue) {
    throw new Error(`${label} is required.`);
  }

  return normalizedValue;
}

function optionalString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeApiKey(value: string | undefined): string {
  return value?.trim() ?? '';
}

function getRequestApiKey(request: ApiRequest): string {
  const value = request.headers['x-giavico-gemini-key'];
  return normalizeApiKey(Array.isArray(value) ? value[0] : value);
}

function isGeminiApiKey(value: string): boolean {
  return /^(?:AIza[A-Za-z0-9_-]{30,}|AQ\.[A-Za-z0-9_-]{30,})$/.test(value);
}

async function validateGeminiApiKey(
  apiKey: string,
): Promise<{ valid: boolean; message?: string }> {
  if (!apiKey) {
    return { valid: false, message: 'GEMINI_API_KEY is missing.' };
  }

  if (!isGeminiApiKey(apiKey)) {
    return {
      valid: false,
      message:
        'GEMINI_API_KEY must contain only an AQ. authorization key or an AIza standard key.',
    };
  }

  try {
    const validationResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1',
      {
        headers: {
          Accept: 'application/json',
          'x-goog-api-key': apiKey,
        },
      },
    );

    if (validationResponse.ok) {
      return { valid: true };
    }

    const payload = (await validationResponse
      .json()
      .catch(() => null)) as GeminiResponse | null;
    return {
      valid: false,
      message:
        payload?.error?.message ??
        `Google rejected GEMINI_API_KEY with status ${validationResponse.status}.`,
    };
  } catch {
    return {
      valid: false,
      message: 'Unable to validate GEMINI_API_KEY with Google.',
    };
  }
}

function isSameOriginRequest(request: ApiRequest): boolean {
  const origin = request.headers.origin;
  const host = request.headers['x-forwarded-host'] ?? request.headers.host;

  if (!origin || !host || Array.isArray(origin) || Array.isArray(host)) {
    return false;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
