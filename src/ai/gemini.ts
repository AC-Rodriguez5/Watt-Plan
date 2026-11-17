/**
 * Gemini client. Uses the Interactions API (the default API in the current Gemini docs;
 * generateContent is marked legacy): POST /v1beta/interactions with the API key in the
 * x-goog-api-key header. A JSON schema goes in `response_format` for structured output.
 * https://ai.google.dev/gemini-api/docs/structured-output
 */

import { postJson } from './http';
import type { GenerateRequest } from './llm';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const API_REVISION = '2026-05-20';

/**
 * Thinking per call. gemini-3.5-flash-lite accepts minimal, low, medium and high: interpret takes
 * the lowest (minimal), and explain, which writes a sentence or two, keeps low.
 */
const THINKING_LEVEL = { interpret: 'minimal', explain: 'low' } as const;

/** Read at call time. Expo inlines EXPO_PUBLIC_ variables written exactly like this. */
export const geminiApiKey = () => process.env.EXPO_PUBLIC_GEMINI_API_KEY;

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

export async function callGemini(model: string, apiKey: string, { kind, systemInstruction, input, schema }: GenerateRequest): Promise<string> {
  const body = await postJson(
    model,
    ENDPOINT,
    { 'x-goog-api-key': apiKey, 'Api-Revision': API_REVISION },
    {
      model,
      input,
      system_instruction: systemInstruction,
      store: false,
      generation_config: { thinking_level: THINKING_LEVEL[kind] },
      ...(schema ? { response_format: { type: 'text', mime_type: 'application/json', schema } } : {}),
    },
  );
  return extractText(body);
}
