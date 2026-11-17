/** Shared plumbing for the provider clients: the error type and one JSON POST with a timeout. */

/** A call that takes longer than this counts as failed. */
export const REQUEST_TIMEOUT_MS = 8000;

/**
 * A model could not be reached or gave nothing usable: no key, no network, a timeout, an error
 * response or an empty answer. `retryable` says whether trying the same model again can help
 * (5xx, timeout, network failure); a 429 or another 4xx moves on to the next model instead.
 */
export class AiUnavailableError extends Error {
  readonly retryable: boolean;
  readonly status?: number;

  constructor(message: string, options?: { cause?: unknown; retryable?: boolean; status?: number }) {
    super(message, { cause: options?.cause });
    this.name = 'AiUnavailableError';
    this.retryable = options?.retryable ?? false;
    this.status = options?.status;
  }
}

/** POSTs JSON and returns the parsed response body. Throws AiUnavailableError on any failure. */
export async function postJson(label: string, url: string, headers: Record<string, string>, body: object): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      let detail = '';
      try {
        detail = (await response.text()).slice(0, 300);
      } catch {}
      throw new AiUnavailableError(`${label} responded with HTTP ${response.status}${detail ? `: ${detail}` : ''}`, {
        status: response.status,
        retryable: response.status >= 500,
      });
    }
    return await response.json();
  } catch (error) {
    if (error instanceof AiUnavailableError) throw error;
    const timedOut = controller.signal.aborted;
    throw new AiUnavailableError(timedOut ? `${label} timed out` : `${label} could not be reached`, { cause: error, retryable: true });
  } finally {
    clearTimeout(timer);
  }
}
