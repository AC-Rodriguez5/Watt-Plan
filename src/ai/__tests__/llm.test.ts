import { HttpStatus, mockLlm } from '../__mocks__/llm-fetch';
import { extractText } from '../gemini';
import { extractGroqText } from '../groq';
import { AiUnavailableError, CHAIN, generate, REQUEST_TIMEOUT_MS } from '../llm';
import { EXPLAIN_SYSTEM, INTERPRET_SCHEMA, INTERPRET_SYSTEM } from '../prompts';
import { getNetworkStateAsync } from 'expo-network';
import { generateWithGemma } from '../gemma';

jest.mock('expo-network', () => ({ getNetworkStateAsync: jest.fn() }));
jest.mock('../gemma', () => ({ generateWithGemma: jest.fn() }));

const offline = new TypeError('Network request failed');
const interpretRequest = { kind: 'interpret', systemInstruction: INTERPRET_SYSTEM, input: 'in', schema: INTERPRET_SCHEMA } as const;
const explainRequest = { kind: 'explain', systemInstruction: EXPLAIN_SYSTEM, input: 'in' } as const;
const models = (sent: { model: string }[]) => sent.map((request) => request.model);

const G120 = 'openai/gpt-oss-120b';
const G20 = 'openai/gpt-oss-20b';
const GEM = 'gemini-3.5-flash-lite';

let log: jest.SpyInstance;
let warn: jest.SpyInstance;

beforeEach(() => {
  delete process.env.EXPO_PUBLIC_FORCE_LOCAL_AI;
  (getNetworkStateAsync as jest.Mock).mockReset().mockResolvedValue({ isConnected: true, isInternetReachable: true });
  (generateWithGemma as jest.Mock).mockReset();
  process.env.EXPO_PUBLIC_GROQ_API_KEY = 'groq-secret-key';
  process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'gemini-secret-key';
  log = jest.spyOn(console, 'log').mockImplementation(() => {});
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  delete process.env.EXPO_PUBLIC_FORCE_LOCAL_AI;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the provider chain', () => {
  it.each([interpretRequest, explainRequest])('forces Gemma for $kind while connected to Metro', async (request) => {
    process.env.EXPO_PUBLIC_FORCE_LOCAL_AI = 'true';
    (generateWithGemma as jest.Mock).mockResolvedValue('local test');
    const { sent } = mockLlm({});
    expect(await generate(request)).toBe('local test');
    expect(sent).toHaveLength(0);
    expect(getNetworkStateAsync).not.toHaveBeenCalled();
  });

  it('ignores the testing switch in production', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, '__DEV__');
    Object.defineProperty(globalThis, '__DEV__', { value: false, configurable: true });
    process.env.EXPO_PUBLIC_FORCE_LOCAL_AI = 'true';
    try {
      mockLlm({ explain: ['cloud'] });
      expect(await generate(explainRequest)).toBe('cloud');
      expect(generateWithGemma).not.toHaveBeenCalled();
    } finally {
      if (descriptor) Object.defineProperty(globalThis, '__DEV__', descriptor);
    }
  });
  it.each([interpretRequest, explainRequest])('uses Gemma offline for $kind without contacting the cloud', async (request) => {
    (getNetworkStateAsync as jest.Mock).mockResolvedValue({ isConnected: false });
    (generateWithGemma as jest.Mock).mockResolvedValue('local answer');
    const { sent } = mockLlm({});
    expect(await generate(request)).toBe('local answer');
    expect(sent).toHaveLength(0);
    expect(generateWithGemma).toHaveBeenCalledWith(request);
  });

  it('uses Gemma when Wi-Fi has no internet, even without cloud keys', async () => {
    delete process.env.EXPO_PUBLIC_GROQ_API_KEY;
    delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    (getNetworkStateAsync as jest.Mock).mockResolvedValue({ isConnected: true, isInternetReachable: false });
    (generateWithGemma as jest.Mock).mockResolvedValue('offline');
    expect(await generate(explainRequest)).toBe('offline');
  });

  it('switches to Gemma if connectivity is lost during a cloud call', async () => {
    (getNetworkStateAsync as jest.Mock).mockResolvedValueOnce({ isConnected: true }).mockResolvedValue({ isConnected: false });
    (generateWithGemma as jest.Mock).mockResolvedValue('local');
    const { sent } = mockLlm({ interpret: [offline, offline] });
    expect(await generate(interpretRequest)).toBe('local');
    expect(models(sent)).toEqual([G120, G120]);
  });

  it('returns to cloud requests when connectivity returns', async () => {
    (getNetworkStateAsync as jest.Mock).mockResolvedValueOnce({ isConnected: false }).mockResolvedValue({ isConnected: true });
    (generateWithGemma as jest.Mock).mockResolvedValue('local');
    const { sent } = mockLlm({ explain: ['online'] });
    expect(await generate(explainRequest)).toBe('local');
    expect(await generate(explainRequest)).toBe('online');
    expect(sent).toHaveLength(1);
  });

  it('surfaces unavailable local inference without sending offline data to cloud', async () => {
    (getNetworkStateAsync as jest.Mock).mockResolvedValue({ isConnected: false });
    (generateWithGemma as jest.Mock).mockRejectedValue(new Error('missing native module'));
    const { sent } = mockLlm({});
    await expect(generate(explainRequest)).rejects.toBeInstanceOf(AiUnavailableError);
    expect(sent).toHaveLength(0);
  });
  it('is Groq gpt-oss-120b, Groq gpt-oss-20b, then Gemini flash-lite', () => {
    expect(CHAIN.map(({ provider, model }) => [provider, model])).toEqual([
      ['groq', G120],
      ['groq', G20],
      ['gemini', GEM],
    ]);
  });

  it('a healthy call uses only the first model, once', async () => {
    const { sent } = mockLlm({ interpret: ['{}'] });
    expect(await generate(interpretRequest)).toBe('{}');
    expect(models(sent)).toEqual([G120]);
  });
});

describe('moving down the chain', () => {
  it('moves to the next model immediately on a 429, with no retry', async () => {
    const { sent } = mockLlm({ interpret: [new HttpStatus(429), 'from the 20b'] });
    expect(await generate(interpretRequest)).toBe('from the 20b');
    expect(models(sent)).toEqual([G120, G20]);
  });

  it('works down to Gemini when both Groq models are rate limited', async () => {
    const { sent } = mockLlm({ explain: [new HttpStatus(429), new HttpStatus(429), 'from gemini'] });
    expect(await generate(explainRequest)).toBe('from gemini');
    expect(sent.map(({ provider }) => provider)).toEqual(['groq', 'groq', 'gemini']);
    expect(models(sent)).toEqual([G120, G20, GEM]);
  });

  it('moves on immediately for any other 4xx too: a retry would fail the same way', async () => {
    const { sent } = mockLlm({ interpret: [new HttpStatus(400), 'ok'] });
    expect(await generate(interpretRequest)).toBe('ok');
    expect(models(sent)).toEqual([G120, G20]);
  });

  it.each([
    ['a 5xx', new HttpStatus(503)],
    ['a network failure', offline],
  ])('retries once on %s, then moves to the next model', async (_name, failure) => {
    const { sent } = mockLlm({ interpret: [failure, failure, 'from the 20b'] });
    expect(await generate(interpretRequest)).toBe('from the 20b');
    expect(models(sent)).toEqual([G120, G120, G20]);
  });

  it('the one retry can succeed, so the next model is never called', async () => {
    const { sent } = mockLlm({ interpret: [new HttpStatus(500), '{"ok":true}'] });
    expect(await generate(interpretRequest)).toBe('{"ok":true}');
    expect(models(sent)).toEqual([G120, G120]);
  });

  it('retries once on a timeout (8 seconds each), then moves on', async () => {
    jest.useFakeTimers();
    const { sent } = mockLlm({ interpret: ['hang', 'hang', 'answer from the 20b'] });
    const pending = generate(interpretRequest);
    await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS * 2);
    expect(await pending).toBe('answer from the 20b');
    expect(models(sent)).toEqual([G120, G120, G20]);
    expect(REQUEST_TIMEOUT_MS).toBe(8000);
  });

  it('throws only when every model fails, with the last failure', async () => {
    const { sent } = mockLlm({ explain: [new HttpStatus(500)] });
    await expect(generate(explainRequest)).rejects.toThrow(new RegExp(`${GEM} responded with HTTP 500`));
    expect(models(sent)).toEqual([G120, G120, G20, G20, GEM, GEM]);
  });

  it('throws on timeouts all the way down', async () => {
    jest.useFakeTimers();
    mockLlm({ explain: ['hang'] });
    const assertion = expect(generate(explainRequest)).rejects.toThrow(/timed out/);
    await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS * 6);
    await assertion;
  });

  it('treats an empty answer as a failure and moves on without a retry', async () => {
    const { sent } = mockLlm({ explain: ['', 'a real answer'] });
    expect(await generate(explainRequest)).toBe('a real answer');
    expect(models(sent)).toEqual([G120, G20]);
  });
});

describe('API keys', () => {
  it('skips the Groq models when there is no Groq key', async () => {
    delete process.env.EXPO_PUBLIC_GROQ_API_KEY;
    const { sent } = mockLlm({ explain: ['hello'] });
    expect(await generate(explainRequest)).toBe('hello');
    expect(models(sent)).toEqual([GEM]);
  });

  it('skips Gemini when there is no Gemini key', async () => {
    delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    const { sent } = mockLlm({ explain: [new HttpStatus(429)] });
    await expect(generate(explainRequest)).rejects.toBeInstanceOf(AiUnavailableError);
    expect(models(sent)).toEqual([G120, G20]);
  });

  it('does not try anything when there is no key at all', async () => {
    delete process.env.EXPO_PUBLIC_GROQ_API_KEY;
    delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    const { fetchMock } = mockLlm({});
    await expect(generate(explainRequest)).rejects.toBeInstanceOf(AiUnavailableError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('the Groq request', () => {
  it('asks for the lowest reasoning, no reasoning back, and a strict JSON schema', async () => {
    const { sent } = mockLlm({ interpret: ['{}'] });
    await generate(interpretRequest);

    const [request] = sent;
    expect(request.url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(request.init.headers).toMatchObject({ Authorization: 'Bearer groq-secret-key' });
    expect(request.body.reasoning_effort).toBe('low');
    expect(request.body.include_reasoning).toBe(false);
    expect(request.body).not.toHaveProperty('reasoning_format');
    expect(request.body.max_completion_tokens).toEqual(expect.any(Number));
    expect(request.body.messages).toEqual([
      { role: 'system', content: INTERPRET_SYSTEM },
      { role: 'user', content: 'in' },
    ]);
    expect(request.body.response_format).toEqual({
      type: 'json_schema',
      json_schema: { name: 'response', strict: true, schema: INTERPRET_SCHEMA },
    });
  });

  it('sends no response_format for a plain-text call', async () => {
    const { sent } = mockLlm({ explain: ['Okay.'] });
    await generate(explainRequest);
    expect(sent[0].body).not.toHaveProperty('response_format');
  });

  it('returns message.content, never message.reasoning', async () => {
    // The fake always puts "REASONING: not the answer" in message.reasoning.
    mockLlm({ explain: ['The final answer.'] });
    expect(await generate(explainRequest)).toBe('The final answer.');
  });
});

describe('the Gemini request', () => {
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_GROQ_API_KEY;
  });

  it('uses the lowest thinking level for interpret and low for explain', async () => {
    const interpret = mockLlm({ interpret: ['{}'] });
    await generate(interpretRequest);
    expect(interpret.sent[0].url).toBe('https://generativelanguage.googleapis.com/v1beta/interactions');
    expect(interpret.sent[0].init.headers).toMatchObject({ 'x-goog-api-key': 'gemini-secret-key' });
    expect(interpret.sent[0].body.generation_config).toEqual({ thinking_level: 'minimal' });
    expect(interpret.sent[0].body.response_format).toEqual({ type: 'text', mime_type: 'application/json', schema: INTERPRET_SCHEMA });

    const explain = mockLlm({ explain: ['Okay.'] });
    await generate(explainRequest);
    expect(explain.sent[0].body.generation_config).toEqual({ thinking_level: 'low' });
  });
});

describe('logging', () => {
  it('says which provider and model answered', async () => {
    mockLlm({ interpret: [new HttpStatus(429), 'ok'] });
    await generate(interpretRequest);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(`[ai] interpret answered by groq ${G20}`);
  });

  it('never logs an API key, even when an error response echoes it back', async () => {
    const echoing = jest.fn(async () => ({ ok: false, status: 401, text: async () => 'bad key groq-secret-key / gemini-secret-key', json: async () => ({}) }));
    globalThis.fetch = echoing as unknown as typeof fetch;
    await expect(generate(explainRequest)).rejects.toBeInstanceOf(AiUnavailableError);

    const output = JSON.stringify([...log.mock.calls, ...warn.mock.calls]);
    expect(warn).toHaveBeenCalled();
    expect(output).not.toContain('groq-secret-key');
    expect(output).not.toContain('gemini-secret-key');
    expect(output).toContain('[redacted]');
  });
});

describe('extractGroqText', () => {
  it('reads the final content', () => {
    expect(extractGroqText({ choices: [{ message: { content: ' Hi ', reasoning: 'thinking' } }] })).toBe('Hi');
  });

  it('does not fall back to the reasoning when the content is empty or missing', () => {
    expect(extractGroqText({ choices: [{ finish_reason: 'length', message: { content: '', reasoning: 'half a thought' } }] })).toBe('');
    expect(extractGroqText({ choices: [{ message: { content: null, reasoning: 'half a thought' } }] })).toBe('');
  });

  it('returns empty text for anything unexpected', () => {
    expect(extractGroqText(null)).toBe('');
    expect(extractGroqText({})).toBe('');
    expect(extractGroqText({ choices: [] })).toBe('');
  });
});

describe('extractText (Gemini)', () => {
  it('joins the text of model_output steps and ignores thoughts', () => {
    expect(
      extractText({ steps: [{ type: 'thought', signature: 'x' }, { type: 'model_output', content: [{ type: 'text', text: ' Hi ' }, { type: 'text', text: 'there ' }] }] }),
    ).toBe('Hi there');
  });

  it('returns empty text for anything unexpected', () => {
    expect(extractText(null)).toBe('');
    expect(extractText({})).toBe('');
    expect(extractText({ steps: [{ type: 'thought' }] })).toBe('');
  });
});
