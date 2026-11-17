import { SAMPLE_APPLIANCES } from '@/store/sample-household';

import { mockLlm } from '../__mocks__/llm-fetch';
import { AiUnavailableError } from '../llm';
import { interpretMessage, MAX_TARGET, MIN_TARGET, validateInterpretation } from '../interpret';
import { INTERPRET_SCHEMA } from '../prompts';

const appliances = SAMPLE_APPLIANCES; // aircon (luxury, 8h), tv (flexible, 5h, min 2), stand-fan (essential, 14h), ...

const valid = (raw: unknown) => {
  const result = validateInterpretation(raw, appliances);
  if (!result.ok) throw new Error(`expected valid, got: ${result.reason}`);
  return result.action;
};
const reason = (raw: unknown) => {
  const result = validateInterpretation(raw, appliances);
  if (result.ok) throw new Error('expected invalid');
  return result.reason;
};

describe('validateInterpretation', () => {
  it('accepts keep and cut_first with known ids, dropping duplicates and any stray value', () => {
    expect(valid({ action: 'keep', appliance_ids: ['stand-fan', 'stand-fan', 'tv'], value: 99999 })).toEqual({
      action: 'keep',
      applianceIds: ['stand-fan', 'tv'],
    });
    expect(valid({ action: 'cut_first', appliance_ids: ['aircon'], value: null })).toEqual({ action: 'cut_first', applianceIds: ['aircon'] });
  });

  it('rejects an id that is not in the appliance list', () => {
    expect(reason({ action: 'keep', appliance_ids: ['stand-fan', 'microwave'], value: null })).toMatch(/microwave/);
  });

  it('rejects keep and cut_first with no appliance', () => {
    expect(reason({ action: 'keep', appliance_ids: [], value: null })).toMatch(/at least one/);
  });

  it('rejects an action that is not listed', () => {
    expect(reason({ action: 'delete_everything', appliance_ids: [], value: null })).toMatch(/action must be one of/);
    expect(reason({ appliance_ids: [], value: null })).toMatch(/action must be one of/);
  });

  it('rejects an answer that is not an object or has bad ids', () => {
    expect(reason(null)).toMatch(/JSON object/);
    expect(reason([])).toMatch(/JSON object/);
    expect(reason('keep')).toMatch(/JSON object/);
    expect(reason({ action: 'keep', appliance_ids: 'tv', value: null })).toMatch(/list of strings/);
    expect(reason({ action: 'keep', appliance_ids: [7], value: null })).toMatch(/list of strings/);
  });

  describe('set_target', () => {
    it('accepts a sane target and rounds it to whole pesos', () => {
      expect(valid({ action: 'set_target', appliance_ids: [], value: 1850.4 })).toEqual({ action: 'set_target', target: 1850 });
      expect(valid({ action: 'set_target', appliance_ids: [], value: MIN_TARGET })).toEqual({ action: 'set_target', target: MIN_TARGET });
    });

    it.each([[null], ['2000'], [NaN], [Infinity], [0], [-500], [MIN_TARGET - 1], [MAX_TARGET + 1]])('rejects %p', (value) => {
      expect(validateInterpretation({ action: 'set_target', appliance_ids: [], value }, appliances).ok).toBe(false);
    });
  });

  describe('set_min_hours', () => {
    it('accepts one essential or flexible appliance with hours up to what it runs now', () => {
      expect(valid({ action: 'set_min_hours', appliance_ids: ['tv'], value: 3 })).toEqual({ action: 'set_min_hours', applianceId: 'tv', hours: 3 });
      expect(valid({ action: 'set_min_hours', appliance_ids: ['stand-fan'], value: 14 })).toMatchObject({ hours: 14 });
      expect(valid({ action: 'set_min_hours', appliance_ids: ['tv'], value: 0 })).toMatchObject({ hours: 0 });
    });

    it('needs exactly one appliance', () => {
      expect(reason({ action: 'set_min_hours', appliance_ids: [], value: 2 })).toMatch(/exactly one/);
      expect(reason({ action: 'set_min_hours', appliance_ids: ['tv', 'washer'], value: 2 })).toMatch(/exactly one/);
    });

    it('rejects luxury appliances, which have no minimum', () => {
      expect(reason({ action: 'set_min_hours', appliance_ids: ['aircon'], value: 2 })).toMatch(/luxury/);
    });

    it.each([[null], ['3'], [NaN], [-1], [25], [6]])('rejects %p hours for a TV that runs 5 h', (value) => {
      expect(validateInterpretation({ action: 'set_min_hours', appliance_ids: ['tv'], value }, appliances).ok).toBe(false);
    });
  });

  it('accepts question and none, carrying no ids or numbers', () => {
    expect(valid({ action: 'question', appliance_ids: ['tv'], value: 5 })).toEqual({ action: 'question' });
    expect(valid({ action: 'none', appliance_ids: [], value: null })).toEqual({ action: 'none' });
  });
});

describe('interpretMessage', () => {
  const keepFan = { action: 'keep', appliance_ids: ['stand-fan'], value: null };
  const bad = { action: 'keep', appliance_ids: ['microwave'], value: null };

  beforeEach(() => {
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'test-key';
    process.env.EXPO_PUBLIC_GROQ_API_KEY = 'test-groq-key';
  });

  it('sends the message, appliances and target with the JSON schema in structured-output mode', async () => {
    const { callsOf } = mockLlm({ interpret: [keepFan] });
    await interpretMessage("I can't cut the fan", appliances, 2000);

    const [request] = callsOf('interpret');
    expect(request.provider).toBe('groq');
    expect(request.url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(request.init.method).toBe('POST');
    expect(request.init.headers).toMatchObject({ Authorization: 'Bearer test-groq-key', 'Content-Type': 'application/json' });
    expect(request.model).toBe('openai/gpt-oss-120b');
    expect(request.schema).toEqual(INTERPRET_SCHEMA);
    expect(request.body.response_format.type).toBe('json_schema');

    const input = JSON.parse(request.input);
    expect(input.message).toBe("I can't cut the fan");
    expect(input.current_monthly_target_pesos).toBe(2000);
    expect(input.appliances).toContainEqual({ id: 'stand-fan', name: 'Stand Fan', category: 'essential', hours: 14 });
    expect(input.appliances).toHaveLength(appliances.length);
  });

  it('returns the validated action', async () => {
    mockLlm({ interpret: [keepFan] });
    expect(await interpretMessage('x', appliances, 2000)).toEqual({ kind: 'ok', action: { action: 'keep', applianceIds: ['stand-fan'] } });
  });

  it('retries once after an invalid answer, telling the model what was wrong', async () => {
    const { callsOf } = mockLlm({ interpret: [bad, keepFan] });
    expect(await interpretMessage('x', appliances, 2000)).toMatchObject({ kind: 'ok' });

    expect(callsOf('interpret')).toHaveLength(2);
    expect(JSON.parse(callsOf('interpret')[0].input).your_previous_answer_was_rejected_because).toBeUndefined();
    expect(JSON.parse(callsOf('interpret')[1].input).your_previous_answer_was_rejected_because).toMatch(/microwave/);
  });

  it('retries once after a reply that is not JSON', async () => {
    const { callsOf } = mockLlm({ interpret: ['Sure! I will keep the fan.', keepFan] });
    expect(await interpretMessage('x', appliances, 2000)).toMatchObject({ kind: 'ok' });
    expect(callsOf('interpret')).toHaveLength(2);
  });

  it('gives up after the second invalid answer: no third call', async () => {
    const { callsOf } = mockLlm({ interpret: [bad] });
    expect(await interpretMessage('x', appliances, 2000)).toEqual({ kind: 'invalid' });
    expect(callsOf('interpret')).toHaveLength(2);
  });

  it('does not re-ask for a valid answer when no model can be reached: it only runs the model chain', async () => {
    const { callsOf } = mockLlm({ interpret: [new TypeError('Network request failed')] });
    await expect(interpretMessage('x', appliances, 2000)).rejects.toBeInstanceOf(AiUnavailableError);
    // Each of the three models, with its one retry. No extra invalid-answer retry on top.
    expect(callsOf('interpret').map((request) => request.model)).toEqual([
      'openai/gpt-oss-120b',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'openai/gpt-oss-20b',
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash-lite',
    ]);
  });
});
