import { Platform } from 'react-native';
import * as Llama from 'llama.rn';

import { SAMPLE_APPLIANCES } from '@/store/sample-household';
import { prepareGemmaModel } from '../gemma-model';

import { generateWithGemma, interpretWithGemma, releaseGemmaContext, runGemmaAssistant } from '../gemma';

jest.mock('llama.rn', () => ({ initLlama: jest.fn() }));
jest.mock('../gemma-model', () => ({ prepareGemmaModel: jest.fn().mockResolvedValue('file:///app/files/gemma.gguf') }));

const initLlama = Llama.initLlama as jest.Mock;

const context = {
  completion: jest.fn(),
  stopCompletion: jest.fn(),
  release: jest.fn(),
};
const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');

beforeAll(() => Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' }));
afterAll(() => {
  if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
});

beforeEach(() => {
  initLlama.mockReset().mockResolvedValue(context);
  (prepareGemmaModel as jest.Mock).mockClear().mockResolvedValue('file:///app/files/gemma.gguf');
  context.completion.mockReset();
  context.stopCompletion.mockReset();
  context.release.mockReset().mockResolvedValue(undefined);
});

afterEach(async () => {
  await releaseGemmaContext();
});

describe('llama.rn Gemma interpreter', () => {
  it('retries malformed intent then falls back to answer-only routing without changing a plan', async () => {
    context.completion.mockResolvedValue({ text: '{"mode":', context_full: true });
    const output = await generateWithGemma({ kind: 'interpret', input: '{"message":"Which appliance contributes most to my bill?"}', systemInstruction: 'Interpret', schema: {} });
    expect(JSON.parse(output)).toEqual({ action: 'question', appliance_ids: [], value: null });
    expect(context.completion).toHaveBeenCalledTimes(2);
  });

  it('recovers an explicit change when the intent retry returns valid JSON', async () => {
    context.completion.mockResolvedValueOnce({ text: '' })
      .mockResolvedValueOnce({ text: '{"mode":"change","instruction_quote":"Set target to 3000"}' })
      .mockResolvedValueOnce({ text: '{"action":"set_target","appliance_ids":[],"value":3000}' });
    const output = await generateWithGemma({ kind: 'interpret', input: '{"message":"Set target to 3000"}', systemInstruction: 'Interpret', schema: {} });
    expect(JSON.parse(output).value).toBe(3000);
    expect(context.completion).toHaveBeenCalledTimes(3);
  });
  it('regenerates truncated prose as a complete answer without exposing its partial text', async () => {
    context.completion.mockResolvedValueOnce({ text: 'The TV uses', stopped_limit: true })
      .mockResolvedValueOnce({ text: 'The aircon contributes most because of its power and usage.' });
    await expect(generateWithGemma({ kind: 'explain', systemInstruction: 'Answer', input: '{}' }))
      .resolves.toBe('The aircon contributes most because of its power and usage.');
    expect(context.completion).toHaveBeenCalledTimes(2);
    for (const [options] of context.completion.mock.calls) expect(options.n_predict).toBe(-1);
  });

  it('waits beyond 180 seconds for the active offline provider without cancelling', async () => {
    jest.useFakeTimers();
    context.completion.mockImplementationOnce(() => new Promise((resolve) => {
      setTimeout(() => resolve({ text: 'Malaki ang ambag ng aircon sa bill mo.' }), 240_000);
    }));
    try {
      const pending = generateWithGemma({ kind: 'explain', systemInstruction: 'Answer in Tagalog', input: '{}' });
      await jest.advanceTimersByTimeAsync(241_000);
      await expect(pending).resolves.toContain('aircon');
      expect(context.stopCompletion).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
  it.each(['Which appliance contributes most to my bill?', 'Give a breakdown of my electricity bill'])('routes %s to an answer before extracting actions', async (message) => {
    context.completion.mockResolvedValueOnce({ text: '{"mode":"answer","instruction_quote":""}' });
    await expect(generateWithGemma({ kind: 'interpret', systemInstruction: 'Interpret', input: JSON.stringify({ message, current_monthly_target_pesos: 2000 }), schema: {} }))
      .resolves.toBe('{"action":"question","appliance_ids":[],"value":null}');
    expect(context.completion).toHaveBeenCalledTimes(1);
    expect(context.completion.mock.calls[0][0].messages[0].content).not.toContain('2000');
  });

  it('requires a verbatim instruction before extracting a change', async () => {
    context.completion.mockResolvedValueOnce({ text: '{"mode":"change","instruction_quote":"set target to 2000"}' });
    const result = await generateWithGemma({ kind: 'interpret', systemInstruction: 'Interpret', input: '{"message":"Explain my bill"}', schema: {} });
    expect(JSON.parse(result).action).toBe('question');
    expect(context.completion).toHaveBeenCalledTimes(1);
  });

  it('extracts an authorized target change after the intent check', async () => {
    context.completion.mockResolvedValueOnce({ text: '{"mode":"change","instruction_quote":"Set my target to 3000"}' })
      .mockResolvedValueOnce({ text: '{"action":"set_target","appliance_ids":[],"value":3000}' });
    const result = await generateWithGemma({ kind: 'interpret', systemInstruction: 'Interpret', input: '{"message":"Set my target to 3000"}', schema: {} });
    expect(JSON.parse(result).value).toBe(3000);
    expect(context.completion).toHaveBeenCalledTimes(2);
  });
  it('uses the current cloud pipeline schema for offline generation without a token cap', async () => {
    context.completion.mockResolvedValue({ text: '{"action":"question","appliance_ids":[],"value":null}' });
    const schema = { type: 'object' };
    await expect(generateWithGemma({ systemInstruction: 'Interpret', input: '{"message":"why?"}', schema }))
      .resolves.toContain('question');
    expect(context.completion).toHaveBeenCalledWith(expect.objectContaining({
      n_predict: -1,
      response_format: { type: 'json_schema', json_schema: { strict: true, schema } },
    }));
  });

  it('rejects an incomplete offline answer instead of displaying it as complete', async () => {
    context.completion.mockResolvedValue({ text: 'Your bill is', context_full: true });
    await expect(generateWithGemma({ systemInstruction: 'Answer', input: '{}' })).rejects.toThrow('context');
  });
  it.each([['10,000', 10000], ['4,000', 4000]])('validates an explicit %s target without a duplicated quote', async (amount, value) => {
    context.completion.mockResolvedValueOnce({ text: JSON.stringify({ request: 'change', action: 'set_target', value }) });
    await expect(runGemmaAssistant({ message: `Make the target bill to ${amount}`, appliances: SAMPLE_APPLIANCES, householdFacts: '{}', recentConversation: '' }))
      .resolves.toMatchObject({ kind: 'action', action: { action: 'set_target', target: value } });
  });

  it('rejects unrelated appliance choices for a household breakdown', async () => {
    context.completion.mockResolvedValueOnce({ text: '{"request":"clarify","appliance_ids":["stand-fan","rice-cooker","washer"]}' });
    await expect(runGemmaAssistant({ message: 'Give a breakdown in why my bill is this high?', appliances: SAMPLE_APPLIANCES, householdFacts: '{}', recentConversation: '' }))
      .resolves.toMatchObject({ kind: 'invalid', reason: expect.stringContaining('did not refer to') });
  });

  it('continues an answer when Gemma runs out of tokens after answering only one part', async () => {
    context.completion.mockResolvedValueOnce({ text: '{"request":"answer"}' })
      .mockResolvedValueOnce({ text: '**Watts** measure power.', stopped_limit: 1 })
      .mockResolvedValueOnce({ text: 'Kilowatt-hours measure energy.' });

    await expect(runGemmaAssistant({
      message: 'What is the difference between watts and kWh?', appliances: SAMPLE_APPLIANCES,
      householdFacts: '{}', recentConversation: '',
    })).resolves.toEqual({ kind: 'answer', text: 'Watts measure power. Kilowatt-hours measure energy.' });
  });

  it('lets a slow local answer finish after three minutes', async () => {
    jest.useFakeTimers();
    context.completion.mockResolvedValueOnce({ text: '{"request":"answer"}' })
      .mockImplementationOnce(() => new Promise((resolve) => {
        setTimeout(() => resolve({ text: 'Watts tell you how much power a device draws.' }), 181_000);
      }));
    try {
      const pending = runGemmaAssistant({ message: 'What does wattage mean?', appliances: SAMPLE_APPLIANCES, householdFacts: '{}', recentConversation: '' });
      const result = expect(pending).resolves.toMatchObject({ kind: 'answer', text: expect.stringContaining('power') });
      await jest.advanceTimersByTimeAsync(182_000);
      await result;
      expect(context.stopCompletion).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('retries when the answer repeats an unrelated preview error', async () => {
    context.completion.mockResolvedValueOnce({ text: '{"request":"answer","clarification":"Which appliance?"}' })
      .mockResolvedValueOnce({ text: 'I don’t have a pending preview to apply. Ask me to preview the change first.' })
      .mockResolvedValueOnce({ text: 'Your aircon contributes most to the estimated bill.' });

    await expect(runGemmaAssistant({
      message: 'Which appliance contributes most to my bill?', appliances: SAMPLE_APPLIANCES,
      householdFacts: '{"appliances":[{"id":"aircon","monthly_kwh":90}]}', recentConversation: '',
    })).resolves.toEqual({ kind: 'answer', text: 'Your aircon contributes most to the estimated bill.' });
  });

  it('accepts rounded household figures in numbered conversational answers', async () => {
    context.completion.mockResolvedValueOnce({ text: '{"request":"answer"}' })
      .mockResolvedValueOnce({ text: '1. Aircon: about 90 kWh and 1,234.57 pesos.\n2. TV: 10 kWh.' });
    await expect(runGemmaAssistant({
      message: 'Where is most of my electricity going?', appliances: SAMPLE_APPLIANCES,
      householdFacts: '{"aircon_kwh":90.123,"aircon_cost":1234.567,"tv_kwh":10}', recentConversation: '',
    })).resolves.toMatchObject({ kind: 'answer', text: expect.stringContaining('1,234.57') });
    expect(context.completion).toHaveBeenCalledTimes(2);
  });

  it('repairs an answer using stale chat figures before showing it', async () => {
    context.completion.mockResolvedValueOnce({ text: '{"request":"answer"}' })
      .mockResolvedValueOnce({ text: 'Your aircon uses 999 kWh.' })
      .mockResolvedValueOnce({ text: 'Your aircon is the largest contributor in the current estimate.' });
    await expect(runGemmaAssistant({
      message: 'What about now?', appliances: SAMPLE_APPLIANCES,
      householdFacts: '{"aircon_kwh":90}', recentConversation: 'assistant: Your aircon uses 999 kWh.',
    })).resolves.toEqual({ kind: 'answer', text: 'Your aircon is the largest contributor in the current estimate.' });
    expect(context.completion).toHaveBeenCalledTimes(3);
  });

  it('bounds answer repair when the model keeps inventing figures', async () => {
    context.completion.mockResolvedValueOnce({ text: '{"request":"answer"}' })
      .mockResolvedValue({ text: 'You can save 99999 pesos.' });
    await expect(runGemmaAssistant({ message: 'How can I save?', appliances: SAMPLE_APPLIANCES,
      householdFacts: '{}', recentConversation: '',
    })).resolves.toMatchObject({ kind: 'invalid' });
    expect(context.completion).toHaveBeenCalledTimes(3);
  });

  it('releases an empty-completion context so the next attempt initializes afresh', async () => {
    context.completion.mockResolvedValue({ text: '' });
    const input = { message: 'Explain my estimate', appliances: SAMPLE_APPLIANCES, householdFacts: '{}', recentConversation: '' };
    await expect(runGemmaAssistant(input)).resolves.toMatchObject({ kind: 'invalid' });
    expect(context.release).toHaveBeenCalledTimes(1);
    await runGemmaAssistant(input);
    expect(initLlama).toHaveBeenCalledTimes(2);
  });
  it('extracts and initializes once, then validates JSON-schema output', async () => {
    context.completion.mockResolvedValue({ text: '{"action":"set_target","appliance_ids":[],"value":2000}' });
    const first = await interpretWithGemma('Set my target to 2000', SAMPLE_APPLIANCES, 2500);
    const second = await interpretWithGemma('Set my target to 2000', SAMPLE_APPLIANCES, 2500);

    expect(first).toEqual({ kind: 'ok', action: { action: 'set_target', target: 2000 } });
    expect(second).toEqual(first);
    expect(initLlama).toHaveBeenCalledTimes(1);
    expect(prepareGemmaModel).toHaveBeenCalledTimes(1);
    expect(context.completion).toHaveBeenCalledTimes(2);
    expect(context.completion.mock.calls[0][0].response_format.type).toBe('json_schema');
  });

  it('returns invalid without applying malformed or out-of-range JSON', async () => {
    context.completion.mockResolvedValue({ text: '{"action":"set_target","appliance_ids":[],"value":0}' });
    await expect(interpretWithGemma('Set target to 0', SAMPLE_APPLIANCES, 2500)).resolves.toEqual({ kind: 'invalid' });
  });

  it('retries a malformed clarification with validator feedback and accepts the corrected action', async () => {
    context.completion
      .mockResolvedValueOnce({ text: '{"action":"clarify","appliance_ids":[],"value":null}' })
      .mockResolvedValueOnce({ text: '{"action":"set_target","appliance_ids":[],"value":1800}' });
    await expect(interpretWithGemma('make my target from 3000 to 1800 pesos', SAMPLE_APPLIANCES, 3000)).resolves.toEqual({
      kind: 'ok',
      action: { action: 'set_target', target: 1800 },
    });
    expect(context.completion).toHaveBeenCalledTimes(2);
    expect(context.completion.mock.calls[1][0].messages[0].content).toContain('clarification did not contain multiple saved appliance IDs');
  });

  it('parses JSON wrapped in Gemma role markers and a Markdown fence', async () => {
    context.completion.mockResolvedValue({ text: '<start_of_turn>model\n```json\n{"action":"set_target","appliance_ids":[],"value":3000}\n```' });
    await expect(interpretWithGemma('set my target to 3000 pesos', SAMPLE_APPLIANCES, 2500)).resolves.toEqual({
      kind: 'ok',
      action: { action: 'set_target', target: 3000 },
    });
  });

  it('rejects clarification candidates unrelated to the message', async () => {
    context.completion.mockResolvedValue({ text: '<start_of_turn>model\n```json\n{"action":"clarify","appliance_ids":["aircon","refrigerator","tv","stand-fan","rice-cooker","washer"],"value":null}\n```' });
    await expect(interpretWithGemma('set my target to 3000 pesos', SAMPLE_APPLIANCES, 2500)).resolves.toEqual({ kind: 'invalid' });
  });

  it('uses Gemma candidate IDs for ambiguity and resolves a unique appliance name', async () => {
    const appliances = [...SAMPLE_APPLIANCES, { ...SAMPLE_APPLIANCES.find(({ id }) => id === 'tv')!, id: 'second-tv', name: 'Bedroom TV' }];
    context.completion.mockResolvedValueOnce({ text: '{"action":"clarify","appliance_ids":["tv","second-tv"],"value":null}' });
    const clarification = await interpretWithGemma('Unahin mong bawasan yung TV', appliances, 2500);
    expect(clarification).toMatchObject({ kind: 'clarification' });
    if (clarification.kind === 'clarification') expect(clarification.text).toContain('Bedroom TV');
    context.completion.mockResolvedValueOnce({ text: '{"action":"cut_first","appliance_ids":["second-tv"],"value":null}' });
    await expect(interpretWithGemma('Unahin mong bawasan yung Bedroom TV', appliances, 2500)).resolves.toEqual({ kind: 'ok', action: { action: 'cut_first', applianceIds: ['second-tv'] } });
    expect(context.completion).toHaveBeenCalledTimes(2);
  });

  it('stops an active completion when the turn is cancelled', async () => {
    const controller = new AbortController();
    let finishCompletion: ((value: { text: string }) => void) | undefined;
    context.completion.mockImplementation(() => new Promise((resolve) => { finishCompletion = resolve; }));
    context.stopCompletion.mockImplementation(async () => finishCompletion?.({ text: '{"action":"none","appliance_ids":[],"value":null}' }));
    const pending = interpretWithGemma('question', SAMPLE_APPLIANCES, 2500, controller.signal);
    while (context.completion.mock.calls.length === 0) await new Promise((resolve) => setTimeout(resolve, 1));
    controller.abort();
    await expect(pending).rejects.toThrow('cancelled');
    expect(context.stopCompletion).toHaveBeenCalledTimes(1);
  });

  it('handles native stopCompletion returning void during cancellation', async () => {
    const controller = new AbortController();
    context.completion.mockImplementation(() => new Promise(() => {}));
    context.stopCompletion.mockImplementation(() => undefined);
    const pending = interpretWithGemma('question', SAMPLE_APPLIANCES, 2500, controller.signal);
    while (context.completion.mock.calls.length === 0) await new Promise((resolve) => setTimeout(resolve, 1));
    controller.abort();
    await expect(pending).rejects.toThrow('cancelled');
    expect(context.stopCompletion).toHaveBeenCalledTimes(1);
  });

  it('clears the init promise when native initialization fails so a retry can recover', async () => {
    initLlama.mockRejectedValueOnce(new Error('native init failed'));
    context.completion.mockResolvedValue({ text: '{"action":"none","appliance_ids":[],"value":null}' });
    await expect(interpretWithGemma('thanks', SAMPLE_APPLIANCES, 2500)).rejects.toThrow('native init failed');
    await expect(interpretWithGemma('thanks', SAMPLE_APPLIANCES, 2500)).resolves.toEqual({ kind: 'ok', action: { action: 'none' } });
    expect(initLlama).toHaveBeenCalledTimes(2);
  });

  it('interprets a paraphrased budget request as a validated local action', async () => {
    context.completion.mockResolvedValue({ text: JSON.stringify({ request: 'change', action: 'set_target', appliance_ids: [], keep_ids: [], value: 3000, value_evidence: 'three thousand', clarification: '' }) });
    await expect(runGemmaAssistant({
      message: 'Could you set the monthly ceiling at three thousand?',
      appliances: SAMPLE_APPLIANCES,
      householdFacts: '{"target_pesos":4400}',
      recentConversation: '',
    })).resolves.toEqual({ kind: 'action', mode: 'apply', action: { action: 'set_target', target: 3000 } });
    expect(context.completion.mock.calls[0][0].response_format.type).toBe('json_schema');
  });

  it('answers regular questions with a second grounded Gemma completion', async () => {
    context.completion
      .mockResolvedValueOnce({ text: JSON.stringify({ request: 'answer', action: 'question', appliance_ids: [], keep_ids: [], value: null, value_evidence: '', clarification: '' }) })
      .mockResolvedValueOnce({ text: '<start_of_turn>model\nThe aircon is the largest saved monthly load.' });
    await expect(runGemmaAssistant({
      message: 'Why does the estimate stay high when the TV is barely on?',
      appliances: SAMPLE_APPLIANCES,
      householdFacts: '{"appliances":[{"name":"Inverter Aircon","monthly_kwh":90}]}',
      recentConversation: 'user: What about the TV?',
    })).resolves.toEqual({ kind: 'answer', text: 'The aircon is the largest saved monthly load.' });
    expect(context.completion).toHaveBeenCalledTimes(2);
    expect(context.completion.mock.calls[1][0].messages[0].content).toContain('monthly_kwh');
  });

  it('rejects a preview confirmation from Gemma when the user has no pending preview', async () => {
    context.completion.mockResolvedValue({ text: '{"request":"apply_pending"}' });

    await expect(runGemmaAssistant({
      message: 'Which of my appliances uses the most electricity?',
      appliances: SAMPLE_APPLIANCES,
      householdFacts: '{"pending_preview":null}',
      recentConversation: '',
    })).resolves.toMatchObject({ kind: 'invalid', reason: expect.stringContaining('no preview exists') });
    expect(context.completion.mock.calls[0][0].response_format.json_schema.schema.properties.request.enum)
      .not.toContain('apply_pending');
  });

  it('does not accept an inferred action with an unknown saved appliance ID', async () => {
    context.completion.mockResolvedValue({ text: JSON.stringify({ request: 'change', action: 'cut_first', appliance_ids: ['not-saved'], keep_ids: [], value: null, value_evidence: '', clarification: '' }) });
    await expect(runGemmaAssistant({
      message: 'Prioritize the space heater', appliances: SAMPLE_APPLIANCES, householdFacts: '{}', recentConversation: '',
    })).resolves.toMatchObject({ kind: 'invalid' });
  });

  it('rejects a made-up target when the user message contains no amount evidence', async () => {
    context.completion.mockResolvedValue({ text: JSON.stringify({ request: 'change', action: 'set_target', appliance_ids: [], keep_ids: [], value: 1800, value_evidence: '', clarification: '' }) });
    await expect(runGemmaAssistant({
      message: 'Is my electricity bill high?', appliances: SAMPLE_APPLIANCES, householdFacts: '{"target_pesos":1800}', recentConversation: '',
    })).resolves.toMatchObject({ kind: 'invalid', reason: expect.stringContaining('amount or duration') });
  });

  it('checks the destination value when the user states old and new amounts', async () => {
    context.completion.mockResolvedValue({ text: JSON.stringify({ request: 'change', action: 'set_target', appliance_ids: [], keep_ids: [], value: 1800, value_evidence: 'from 3000 to 1800 pesos', clarification: '' }) });
    await expect(runGemmaAssistant({
      message: 'Could you move my budget from 3000 to 1800 pesos?', appliances: SAMPLE_APPLIANCES, householdFacts: '{}', recentConversation: '',
    })).resolves.toMatchObject({ kind: 'action', action: { action: 'set_target', target: 1800 } });
  });

  it('accepts a model-converted minute reduction only when it matches quoted evidence', async () => {
    context.completion.mockResolvedValue({ text: JSON.stringify({ request: 'change', action: 'reduce_hours', appliance_ids: ['tv'], keep_ids: [], value: 0.5, value_evidence: '30 minutes less each day', clarification: '' }) });
    await expect(runGemmaAssistant({
      message: 'Could I use the TV 30 minutes less each day?', appliances: SAMPLE_APPLIANCES, householdFacts: '{}', recentConversation: '',
    })).resolves.toMatchObject({ kind: 'action', action: { action: 'reduce_hours', applianceId: 'tv', hours: 0.5 } });
  });
});
