import { computePlan } from '@/optimizer/compute-plan';
import { buildBaseline } from '@/optimizer/optimizer';
import { SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS } from '@/store/sample-household';
import type { PlanChangeAction } from '@/types/chat';
import { NO_CONSTRAINTS } from '@/types/energy';
import { formatPeso } from '@/utils/format';

import { HttpStatus, mockGemini } from '../__mocks__/gemini-fetch';
import { answerFromPlan, explainPlanChange, usesOnlyGivenNumbers } from '../explain';
import { buildExplainFacts } from '../prompts';
import { NOTHING_TO_ANSWER_REPLY } from '../templates';

const appliances = SAMPLE_APPLIANCES;
const baseline = buildBaseline(appliances, SAMPLE_BILL_SETTINGS);
const previous = computePlan(appliances, SAMPLE_BILL_SETTINGS, 3300, 'fewest-changes', NO_CONSTRAINTS)!;
const keepAircon: PlanChangeAction = { action: 'keep', applianceIds: ['aircon'] };
const next = computePlan(appliances, SAMPLE_BILL_SETTINGS, 3300, 'fewest-changes', { keep: ['aircon'], cutFirst: [] })!;
const unreachable = computePlan(appliances, SAMPLE_BILL_SETTINGS, 100, 'fewest-changes', NO_CONSTRAINTS)!;

beforeEach(() => {
  process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'test-key';
});

describe('usesOnlyGivenNumbers', () => {
  const facts = { projected_bill_pesos: 1985, kwh: 12.5, user_message: 'cut the 50" TV to 3 hours' };

  it('accepts the numbers in the facts and in the user message, however they are written', () => {
    expect(usesOnlyGivenNumbers('Your bill is now ₱1,985.', facts)).toBe(true);
    expect(usesOnlyGivenNumbers('That is 12.5 kWh, and 3 hours on the 50" TV.', facts)).toBe(true);
    expect(usesOnlyGivenNumbers('Wala nang pagbabago.', facts)).toBe(true);
  });

  it('rejects a number that is not in the facts, even a derived one', () => {
    expect(usesOnlyGivenNumbers('You will save ₱300 more.', facts)).toBe(false);
    expect(usesOnlyGivenNumbers('Your bill is ₱1,986.', facts)).toBe(false);
    expect(usesOnlyGivenNumbers('Around 2,000 pesos.', facts)).toBe(false);
  });
});

describe('explainPlanChange', () => {
  it('sends the old and new plan from the optimizer, the change and the message', async () => {
    const { callsOf } = mockGemini({ explain: ['Okay, the aircon stays.'] });
    await explainPlanChange("keep the aircon, can't cut it", keepAircon, appliances, previous, next);

    const [request] = callsOf('explain');
    expect(request.body.response_format).toBeUndefined(); // plain text, not JSON
    const facts = JSON.parse(request.body.input);
    expect(facts.user_message).toBe("keep the aircon, can't cut it");
    expect(facts.change).toEqual({ type: 'keep_untouched', appliances: ['Inverter Aircon'] });
    expect(facts.plan_before.projected_bill_pesos).toBe(Math.round(previous.projectedBill));
    expect(facts.plan_after.projected_bill_pesos).toBe(Math.round(next.projectedBill));
    expect(facts.plan_after.cuts.map((cut: { appliance: string }) => cut.appliance)).not.toContain('Inverter Aircon');
    expect(request.body.system_instruction).toMatch(/2 to 3 short sentences/);
    expect(request.body.system_instruction).toMatch(/Taglish/);
  });

  it("returns the model's text when it only uses given numbers", async () => {
    const projected = formatPeso(next.projectedBill);
    mockGemini({ explain: [`Okay, the aircon stays. Your projected bill is ${projected}.`] });
    expect(await explainPlanChange('keep aircon', keepAircon, appliances, previous, next)).toBe(
      `Okay, the aircon stays. Your projected bill is ${projected}.`,
    );
  });

  describe('falls back to a template built from the optimizer result', () => {
    const template = `Okay, Inverter Aircon stays as it is. Your projected bill is now ${formatPeso(next.projectedBill)}, ${formatPeso(next.target - next.projectedBill)} under your ${formatPeso(next.target)} target.`;

    it.each([
      ['the network is off', new TypeError('Network request failed')],
      ['the API returns an error', new HttpStatus(503)],
      ['the call times out', new Error('aborted')],
      ['the model answers with nothing', ''],
      ['the model invents a number', 'Okay! That saves you ₱777 every month.'],
    ])('when %s', async (_name, answer) => {
      mockGemini({ explain: [answer] });
      expect(await explainPlanChange('keep aircon', keepAircon, appliances, previous, next)).toBe(template);
    });

    it('when the API key is missing, without calling the network', async () => {
      delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      const { fetchMock } = mockGemini({});
      expect(await explainPlanChange('keep aircon', keepAircon, appliances, previous, next)).toBe(template);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('on a timeout, after three 8 second attempts (preferred model, retry, fallback model)', async () => {
      jest.useFakeTimers();
      try {
        mockGemini({ explain: ['hang'] });
        const pending = explainPlanChange('keep aircon', keepAircon, appliances, previous, next);
        await jest.advanceTimersByTimeAsync(3 * 8000);
        expect(await pending).toBe(template);
      } finally {
        jest.useRealTimers();
      }
    });

    it('says so plainly when the target cannot be reached', async () => {
      mockGemini({ explain: [new TypeError('Network request failed')] });
      const text = await explainPlanChange('set target 100', { action: 'set_target', target: 100 }, appliances, previous, unreachable);
      expect(text).toBe(
        `Okay, your target is now ₱100. I can't reach your ₱100 target, so I cut as far as I can. The lowest bill is ${formatPeso(unreachable.floor)}.`,
      );
    });
  });
});

describe('answerFromPlan', () => {
  it('sends the current plan and per-appliance costs, never the old/new pair', async () => {
    const { callsOf } = mockGemini({ answer: ['The aircon costs the most.'] });
    await answerFromPlan('why is my bill high?', 'question', next, baseline, appliances);

    const facts = JSON.parse(callsOf('answer')[0].body.input);
    expect(facts.current_plan.projected_bill_pesos).toBe(Math.round(next.projectedBill));
    expect(facts.plan_before).toBeUndefined();
    expect(facts.appliance_monthly_costs).toHaveLength(appliances.length);
  });

  it("returns the model's answer", async () => {
    mockGemini({ answer: ['Ang aircon ang pinakamalaki sa bill mo.'] });
    expect(await answerFromPlan('bakit mataas bill ko?', 'question', next, baseline, appliances)).toBe('Ang aircon ang pinakamalaki sa bill mo.');
  });

  it('falls back to a template from the plan when the call fails', async () => {
    mockGemini({ answer: [new TypeError('Network request failed')] });
    const text = await answerFromPlan('why is my bill high?', 'question', next, baseline, appliances);
    expect(text).toBe(
      `Your estimated bill is ${formatPeso(next.currentEstimate)} against a ${formatPeso(next.target)} target. Inverter Aircon is the biggest part of it.`,
    );
  });

  it('falls back to a pointer to what the assistant can do for "none"', async () => {
    mockGemini({ answer: [new HttpStatus(500)] });
    expect(await answerFromPlan('thanks', 'none', next, baseline, appliances)).toBe(NOTHING_TO_ANSWER_REPLY);
  });

  it('drops an answer that invents a figure', async () => {
    mockGemini({ answer: ['You would save ₱4,321 by turning everything off.'] });
    expect(await answerFromPlan('what if', 'question', next, baseline, appliances)).toMatch(/Your estimated bill is/);
  });
});

describe('buildExplainFacts', () => {
  it('only carries numbers the optimizer produced or the user asked for', () => {
    const facts = buildExplainFacts('target 1800', { action: 'set_target', target: 1800 }, appliances, previous, next);
    expect(facts.change).toEqual({ type: 'new_monthly_target', target_pesos: 1800 });
    expect(facts.projected_bill_change_pesos).toBe(Math.round(next.projectedBill - previous.projectedBill));
  });
});
