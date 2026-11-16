import { HttpStatus, mockGemini } from '../__mocks__/gemini-fetch';
import { AiUnavailableError, extractText, generate, MODELS, REQUEST_TIMEOUT_MS } from '../gemini';
import { ANSWER_SYSTEM, EXPLAIN_SYSTEM, INTERPRET_SYSTEM } from '../prompts';

const offline = new TypeError('Network request failed');
const interpretRequest = { kind: 'interpret', systemInstruction: INTERPRET_SYSTEM, input: 'in' } as const;
const explainRequest = { kind: 'explain', systemInstruction: EXPLAIN_SYSTEM, input: 'in' } as const;
const models = (sent: { body: { model: string } }[]) => sent.map((request) => request.body.model);

beforeEach(() => {
  process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'test-key';
});
afterEach(() => jest.useRealTimers());

describe('models', () => {
  it('interpret and explain both prefer gemini-3.5-flash-lite, each falling back to gemini-3.5-flash', () => {
    expect(MODELS.interpret).toEqual({ primary: 'gemini-3.5-flash-lite', fallback: 'gemini-3.5-flash' });
    expect(MODELS.explain).toEqual({ primary: 'gemini-3.5-flash-lite', fallback: 'gemini-3.5-flash' });
  });

  it('a healthy call uses only its preferred model, once', async () => {
    const interpret = mockGemini({ interpret: ['{}'] });
    await generate(interpretRequest);
    expect(models(interpret.sent)).toEqual(['gemini-3.5-flash-lite']);

    const explain = mockGemini({ explain: ['Okay.'] });
    await generate(explainRequest);
    expect(models(explain.sent)).toEqual(['gemini-3.5-flash-lite']);
  });
});

describe('fallback after one failed retry', () => {
  it.each([
    ['interpret', interpretRequest, ['gemini-3.5-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.5-flash']],
    ['explain', explainRequest, ['gemini-3.5-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.5-flash']],
  ] as const)('%s: preferred model, its retry, then the other model', async (kind, request, expected) => {
    const { sent } = mockGemini({ [kind]: [offline, new HttpStatus(503), 'from the fallback'] });
    expect(await generate(request)).toBe('from the fallback');
    expect(models(sent)).toEqual(expected);
  });

  it('the retry on the preferred model can succeed, so the fallback is never called', async () => {
    const { sent } = mockGemini({ interpret: [new HttpStatus(500), '{"ok":true}'] });
    expect(await generate(interpretRequest)).toBe('{"ok":true}');
    expect(models(sent)).toEqual(['gemini-3.5-flash-lite', 'gemini-3.5-flash-lite']);
  });

  it('throws only when all three attempts fail', async () => {
    const { sent } = mockGemini({ explain: [new HttpStatus(500)] });
    await expect(generate(explainRequest)).rejects.toThrow(/gemini-3.5-flash responded with HTTP 500/);
    expect(sent).toHaveLength(3);
  });

  it('gives each attempt its own 8 second timeout', async () => {
    jest.useFakeTimers();
    const { sent } = mockGemini({ interpret: ['hang', 'hang', 'answer from the fallback'] });
    const pending = generate(interpretRequest);
    await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS * 2);
    expect(await pending).toBe('answer from the fallback');
    expect(models(sent)).toEqual(['gemini-3.5-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.5-flash']);
    expect(REQUEST_TIMEOUT_MS).toBe(8000);
  });

  it('times out after 8 seconds per attempt when every model hangs', async () => {
    jest.useFakeTimers();
    mockGemini({ explain: ['hang'] });
    const pending = generate(explainRequest);
    const assertion = expect(pending).rejects.toThrow(/timed out/);
    await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS * 3);
    await assertion;
  });

  it('does not try anything when the API key is missing', async () => {
    delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    const { fetchMock } = mockGemini({});
    await expect(generate(explainRequest)).rejects.toBeInstanceOf(AiUnavailableError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends every attempt with the same request body apart from the model', async () => {
    const { sent } = mockGemini({ answer: [offline, offline, 'ok'] });
    await generate({ ...explainRequest, systemInstruction: ANSWER_SYSTEM });
    const [first, , third] = sent.map(({ body }) => body);
    expect({ ...third, model: first.model }).toEqual(first);
  });
});

describe('extractText', () => {
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
