/**
 * The one place that talks to Gemini. Uses the Interactions API (the default API in the current
 * Gemini docs; generateContent is marked legacy): POST /v1beta/interactions with the API key in
 * the x-goog-api-key header. A JSON schema goes in `response_format` for structured output.
 * https://ai.google.dev/gemini-api/docs/structured-output
 */

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const API_REVISION = '2026-05-20';

const FLASH = 'gemini-3.5-flash';
const FLASH_LITE = 'gemini-3.5-flash-lite';

/**
 * Which model each kind of call prefers, and the other one it falls back to. A call is tried on its
 * preferred model, retried once there, then tried once on the fallback (see `generate`).
 * - interpret needs to follow the schema closely: Flash first.
 * - explain writes two or three sentences: Flash-Lite first.
 */
export const MODELS = {
  interpret: { primary: FLASH, fallback: FLASH_LITE },
  explain: { primary: FLASH_LITE, fallback: FLASH },
} as const;

export type CallKind = keyof typeof MODELS;

/** A call that takes longer than this counts as failed. */
export const REQUEST_TIMEOUT_MS = 8000;

/** The model could not be reached: no key, no network, a timeout, or an error response. */
export class AiUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AiUnavailableError';
  }
}

export type GenerateRequest = {
  kind: CallKind;
  systemInstruction: string;
  input: string;
  /** JSON schema for structured output. Omit for a plain text answer. */
  schema?: object;
};

type Step = { type?: string; content?: { type?: string; text?: string }[] };

/** The text of the model's answer. Empty when it answered with nothing (for example, a blocked response). */
export function extractText(body: unknown): string {
  const steps = (body as { steps?: Step[] } | null)?.steps;
  if (!Array.isArray(steps)) return '';
  return steps
    .filter((step) => step?.type === 'model_output')
    .flatMap((step) => step.content ?? [])
    .filter((part) => part?.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('')
    .trim();
}

/** One request to one model. Throws AiUnavailableError when it cannot be reached in time. */
async function generateOnce(model: string, apiKey: string, { systemInstruction, input, schema }: GenerateRequest): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey, 'Api-Revision': API_REVISION },
      body: JSON.stringify({
        model,
        input,
        system_instruction: systemInstruction,
        store: false,
        // Short answers: low thinking keeps both calls well inside the timeout.
        generation_config: { thinking_level: 'low' },
        ...(schema ? { response_format: { type: 'text', mime_type: 'application/json', schema } } : {}),
      }),
    });
    if (!response.ok) throw new AiUnavailableError(`${model} responded with HTTP ${response.status}`);
    return extractText(await response.json());
  } catch (error) {
    if (error instanceof AiUnavailableError) throw error;
    const timedOut = controller.signal.aborted;
    throw new AiUnavailableError(timedOut ? `${model} timed out` : `${model} could not be reached`, { cause: error });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Sends a request and returns the answer text. The call's preferred model gets two attempts (the
 * first, and one retry); if both fail, the other model gets one. Each attempt has its own 8 second
 * timeout. Throws AiUnavailableError, with the last failure, only when all three fail.
 */
export async function generate(request: GenerateRequest): Promise<string> {
  // Read at call time. Expo inlines EXPO_PUBLIC_ variables written exactly like this.
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new AiUnavailableError('EXPO_PUBLIC_GEMINI_API_KEY is not set');

  const { primary, fallback } = MODELS[request.kind];
  let failure: unknown;
  for (const model of [primary, primary, fallback]) {
    try {
      return await generateOnce(model, apiKey, request);
    } catch (error) {
      failure = error;
    }
  }
  throw failure;
}
