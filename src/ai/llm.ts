/**
 * The one place the app asks a language model for text. Confirmed offline calls use bundled
 * Gemma. Otherwise a call walks a fixed provider chain:
 *
 *   1. Groq openai/gpt-oss-120b
 *   2. Groq openai/gpt-oss-20b
 *   3. Gemini gemini-3.5-flash-lite
 *
 * and falls back to on-device Gemma when no cloud key is configured or every cloud entry fails.
 * If Gemma also fails, AiUnavailableError lets the caller use its template (explain) or offline
 * reply (interpret). Per entry:
 *   - 429 (rate limited), or any other 4xx, or an empty answer: next entry at once, no retry.
 *   - 5xx, timeout or network failure: one retry on the same entry, then the next entry.
 * An entry whose API key is not set is skipped.
 */

import { AiUnavailableError } from './http';
import { callGemini, geminiApiKey } from './gemini';
import { callGroq, groqApiKey } from './groq';
import { getNetworkStateAsync } from 'expo-network';

export { AiUnavailableError, REQUEST_TIMEOUT_MS } from './http';

export type CallKind = 'interpret' | 'explain';

export type GenerateRequest = {
  kind: CallKind;
  systemInstruction: string;
  input: string;
  /** JSON schema for structured output. Omit for a plain text answer. */
  schema?: object;
};

type Entry = {
  provider: 'groq' | 'gemini';
  model: string;
  apiKey: () => string | undefined;
  call: (model: string, apiKey: string, request: GenerateRequest) => Promise<string>;
};

export const CHAIN: readonly Entry[] = [
  { provider: 'groq', model: 'openai/gpt-oss-120b', apiKey: groqApiKey, call: callGroq },
  { provider: 'groq', model: 'openai/gpt-oss-20b', apiKey: groqApiKey, call: callGroq },
  { provider: 'gemini', model: 'gemini-3.5-flash-lite', apiKey: geminiApiKey, call: callGemini },
];

/** Never let a key reach the log, even if an error message were to echo one back. */
function redact(message: string, keys: (string | undefined)[]): string {
  return keys.reduce<string>((text, key) => (key ? text.split(key).join('[redacted]') : text), message);
}

/** One entry, with one retry when the failure is the kind a retry can fix. Throws the last failure. */
async function tryEntry(entry: Entry, apiKey: string, request: GenerateRequest, keys: (string | undefined)[]): Promise<string> {
  const label = `${entry.provider} ${entry.model}`;
  let failure: AiUnavailableError | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const text = await entry.call(entry.model, apiKey, request);
      if (text === '') throw new AiUnavailableError(`${label} returned no answer`);
      return text;
    } catch (error) {
      failure = error instanceof AiUnavailableError ? error : new AiUnavailableError(`${label} failed`, { cause: error });
      console.warn(`[ai] ${request.kind} ${label} attempt ${attempt + 1} failed: ${redact(failure.message, keys)}`);
      if (!failure.retryable) break;
    }
  }
  throw failure;
}

/** Tries the cloud chain and falls back to Gemma when offline or when every cloud entry fails. */
export async function generate(request: GenerateRequest): Promise<string> {
  if (await isOffline()) return generateOffline(request);
  const keys = CHAIN.map((entry) => entry.apiKey());
  let tried = 0;
  for (const entry of CHAIN) {
    const apiKey = entry.apiKey();
    if (!apiKey) continue;
    tried++;
    try {
      const text = await tryEntry(entry, apiKey, request, keys);
      console.log(`[ai] ${request.kind} answered by ${entry.provider} ${entry.model}`);
      return text;
    } catch {
      // A connection can disappear during an online request. Recheck before trying another provider.
      if (await isOffline()) return generateOffline(request);
    }
  }
  if (tried === 0) console.warn('[ai] No cloud API key is configured; trying on-device Gemma.');
  else console.warn('[ai] Cloud providers are unavailable; trying on-device Gemma.');
  return generateOffline(request);
}

async function isOffline(): Promise<boolean> {
  try {
    const network = await getNetworkStateAsync();
    return network?.isConnected === false || network?.isInternetReachable === false;
  } catch {
    // An unavailable connectivity probe is not proof of an offline device.
    return false;
  }
}

async function generateOffline(request: GenerateRequest): Promise<string> {
  try {
    // Keep the native runtime unloaded during normal cloud calls and on Expo Go startup.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { generateWithGemma } = require('./gemma') as typeof import('./gemma');
    const text = await generateWithGemma(request);
    if (typeof text !== 'string' || !text.trim()) throw new Error('On-device Gemma returned no answer');
    console.log(`[ai] ${request.kind} answered by on-device Gemma`);
    return text;
  } catch (cause) {
    const reason = redact(cause instanceof Error ? cause.message : String(cause), [groqApiKey(), geminiApiKey()]);
    console.warn('[ai] On-device Gemma failed.', { kind: request.kind, reason });
    throw new AiUnavailableError('On-device Gemma could not complete the offline request', { cause });
  }
}
