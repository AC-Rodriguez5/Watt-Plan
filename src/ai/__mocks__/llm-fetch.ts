import { ANSWER_SYSTEM, EXPLAIN_SYSTEM, INTERPRET_SYSTEM } from '../prompts';

/**
 * Test helper: fakes the Groq and Gemini HTTP APIs (fetch) so tests run offline with canned answers.
 * The URL decides the provider, and so the shape of the reply.
 */

/** Make the fake answer with this HTTP error status (e.g. 500, 429). */
export class HttpStatus {
  constructor(readonly status: number) {}
}

/** What the fake provider says back. A string or object is the answer text; the rest are failures. */
export type FakeAnswer = string | object | Error | HttpStatus | 'hang';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

const toText = (answer: string | object) => (typeof answer === 'string' ? answer : JSON.stringify(answer));

const okGroq = (text: string) => ({
  ok: true,
  status: 200,
  json: async () => ({ choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: text, reasoning: 'REASONING: not the answer' } }] }),
});

const okGemini = (text: string) => ({
  ok: true,
  status: 200,
  json: async () => ({ status: 'completed', steps: [{ type: 'thought' }, { type: 'model_output', content: [{ type: 'text', text }] }] }),
});

export type SentRequest = {
  url: string;
  init: RequestInit;
  provider: 'groq' | 'gemini';
  /** Provider-independent view of what was sent. */
  model: string;
  system: string;
  input: string;
  schema?: unknown;
  /** The raw JSON body, as that provider's API takes it. */
  body: Record<string, any>;
  kind: 'interpret' | 'explain' | 'answer';
};

type Script = {
  /** Answers for the interpret call, in the order the attempts are made (across providers); the last one repeats. */
  interpret?: FakeAnswer[];
  explain?: FakeAnswer[];
  answer?: FakeAnswer[];
};

/**
 * Installs a fake global fetch. Each kind of call (interpret / explain / answer) plays its script
 * in order, one entry per HTTP attempt whichever provider receives it, and repeats the last entry.
 * `hang` never answers until the request is aborted.
 */
export function mockLlm(script: Script) {
  const counters = { interpret: 0, explain: 0, answer: 0 };
  const sent: SentRequest[] = [];

  const fetchMock = jest.fn(async (url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    const provider: SentRequest['provider'] = url === GROQ_URL ? 'groq' : 'gemini';
    if (url !== GROQ_URL && url !== GEMINI_URL) throw new Error(`unexpected url ${url}`);

    const system: string = provider === 'groq' ? body.messages[0].content : body.system_instruction;
    const input: string = provider === 'groq' ? body.messages[1].content : body.input;
    const schema = provider === 'groq' ? body.response_format?.json_schema?.schema : body.response_format?.schema;
    const kind: SentRequest['kind'] = system === INTERPRET_SYSTEM ? 'interpret' : system === EXPLAIN_SYSTEM ? 'explain' : 'answer';
    if (system !== ANSWER_SYSTEM && kind === 'answer') throw new Error('unexpected system instruction');
    sent.push({ url, init, provider, model: body.model, system, input, schema, body, kind });

    const answers = script[kind] ?? [new Error('no script for this call')];
    const answer = answers[Math.min(counters[kind]++, answers.length - 1)];
    if (answer instanceof Error) throw answer;
    if (answer instanceof HttpStatus) return { ok: false, status: answer.status, text: async () => 'error body', json: async () => ({}) };
    if (answer === 'hang') {
      return new Promise((_, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    }
    return (provider === 'groq' ? okGroq : okGemini)(toText(answer));
  });

  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return { fetchMock, sent, callsOf: (kind: SentRequest['kind']) => sent.filter((request) => request.kind === kind) };
}
