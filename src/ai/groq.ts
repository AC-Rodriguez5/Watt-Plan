/**
 * Groq client (OpenAI-compatible chat completions) for the openai/gpt-oss models.
 * https://console.groq.com/docs/reasoning · https://console.groq.com/docs/structured-outputs
 */

import { postJson } from './http';
import type { GenerateRequest } from './llm';

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

/** gpt-oss accepts low, medium or high. Low is the lowest: "none" would be rejected with a 400. */
const REASONING_EFFORT = 'low';

/** Reasoning tokens are drawn from this budget too, so leave room above the short answer itself. */
const MAX_COMPLETION_TOKENS = 2048;

/** Read at call time. Expo inlines EXPO_PUBLIC_ variables written exactly like this. */
export const groqApiKey = () => process.env.EXPO_PUBLIC_GROQ_API_KEY;

/**
 * The final answer: choices[0].message.content. The model's reasoning arrives in a separate
 * `message.reasoning` field, which this never reads, so an answer cut off mid-thought comes back
 * empty instead of leaking its reasoning as the reply.
 */
export function extractGroqText(body: unknown): string {
  const content = (body as { choices?: { message?: { content?: unknown } }[] } | null)?.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content.trim() : '';
}

export async function callGroq(model: string, apiKey: string, { systemInstruction, input, schema }: GenerateRequest): Promise<string> {
  const body = await postJson(
    model,
    ENDPOINT,
    { Authorization: `Bearer ${apiKey}` },
    {
      model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: input },
      ],
      reasoning_effort: REASONING_EFFORT,
      // Do not return the reasoning at all. (reasoning_format is not supported on gpt-oss.)
      include_reasoning: false,
      max_completion_tokens: MAX_COMPLETION_TOKENS,
      ...(schema ? { response_format: { type: 'json_schema', json_schema: { name: 'response', strict: true, schema } } } : {}),
    },
  );
  return extractGroqText(body);
}
