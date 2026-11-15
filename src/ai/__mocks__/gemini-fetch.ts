import { ANSWER_SYSTEM, EXPLAIN_SYSTEM, INTERPRET_SYSTEM } from '../prompts';

/** Test helper: fakes Gemini's Interactions API (fetch) so tests run offline with canned answers. */

/** Make the fake answer with this HTTP error status (e.g. 500, 429). */
export class HttpStatus {
  constructor(readonly status: number) {}
}

export type FakeAnswer = string | object | Error | HttpStatus | 'hang';

const ok = (text: string) => ({
  ok: true,
  status: 200,
  json: async () => ({ status: 'completed', steps: [{ type: 'thought' }, { type: 'model_output', content: [{ type: 'text', text }] }] }),
});

const toText = (answer: string | object) => (typeof answer === 'string' ? answer : JSON.stringify(answer));

export type SentRequest = {
  url: string;
  init: RequestInit;
  body: { model: string; input: string; system_instruction: string; response_format?: { schema: unknown }; [key: string]: unknown };
  kind: 'interpret' | 'explain' | 'answer';
};

type Script = {
  /** Answers for the interpret call, used in order; the last one repeats. */
  interpret?: FakeAnswer[];
  explain?: FakeAnswer[];
  answer?: FakeAnswer[];
};

/**
 * Installs a fake global fetch. Each kind of call (interpret / explain / answer) plays its script
 * in order and repeats the last entry. `hang` never answers until the request is aborted.
 */
export function mockGemini(script: Script) {
  const counters = { interpret: 0, explain: 0, answer: 0 };
  const sent: SentRequest[] = [];

  const fetchMock = jest.fn(async (url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    const kind: SentRequest['kind'] =
      body.system_instruction === INTERPRET_SYSTEM ? 'interpret' : body.system_instruction === EXPLAIN_SYSTEM ? 'explain' : 'answer';
    if (body.system_instruction !== ANSWER_SYSTEM && kind === 'answer') throw new Error('unexpected system instruction');
    sent.push({ url, init, body, kind });

    const answers = script[kind] ?? [new Error('no script for this call')];
    const answer = answers[Math.min(counters[kind]++, answers.length - 1)];
    if (answer instanceof Error) throw answer;
    if (answer instanceof HttpStatus) return { ok: false, status: answer.status, json: async () => ({}) };
    if (answer === 'hang') {
      return new Promise((_, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    }
    return ok(toText(answer));
  });

  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return { fetchMock, sent, callsOf: (kind: SentRequest['kind']) => sent.filter((request) => request.kind === kind) };
}
