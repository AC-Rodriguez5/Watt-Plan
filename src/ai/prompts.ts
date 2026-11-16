import type { Baseline } from '@/optimizer/optimizer';
import { projectedBillChange, targetMargin } from '@/optimizer/plan-revision';
import type { PlanChangeAction } from '@/types/chat';
import type { Appliance, Plan } from '@/types/energy';

/**
 * Every prompt, schema and prompt payload for the Gemini calls lives here. The model only ever
 * sees numbers the optimizer produced (or the user typed) and is told never to compute any.
 */

export const INTERPRET_ACTIONS = ['keep', 'cut_first', 'set_target', 'set_min_hours', 'question', 'none'] as const;

/**
 * Structured-output schema for the interpret call. Kept to the supported JSON Schema subset and
 * free of min/max bounds (they are costly for the decoder); bounds are checked in code instead
 * (src/ai/interpret.ts).
 */
export const INTERPRET_SCHEMA = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: [...INTERPRET_ACTIONS],
      description: 'What the user wants. See the system instruction for each value.',
    },
    appliance_ids: {
      type: 'array',
      items: { type: 'string' },
      description: 'Ids from the appliance list the action applies to. Empty for set_target, question and none.',
    },
    value: {
      type: ['number', 'null'],
      description:
        'set_target: the monthly bill target in pesos. set_min_hours: the minimum hours per day. Otherwise null. Only a number the user stated.',
    },
  },
  required: ['action', 'appliance_ids', 'value'],
  additionalProperties: false,
} as const;

export const INTERPRET_SYSTEM = `You read one chat message from a Filipino household using an electricity-budget planner and turn it into a single JSON action. The message may be English or Taglish.

You never compute costs, savings or hours. You only pick an action and copy ids and numbers the user stated.

Actions:
- keep: the user does not want these appliances' hours reduced ("I can't cut the fan", "huwag galawin ang ref"). appliance_ids lists them.
- cut_first: the user wants these appliances reduced before the others ("cut the TV more"). appliance_ids lists them.
- set_target: the user states a new monthly bill target in pesos. value is that amount. appliance_ids is empty.
- set_min_hours: the user states the fewest hours per day one appliance may run ("the TV needs at least 3 hours"). appliance_ids has exactly that one appliance. value is the hours. Never use it for a luxury appliance.
- question: the user asks something about their bill or plan and wants no change.
- none: anything else: greetings, thanks, requests you cannot express with the actions above.

Rules:
- Use only ids from the appliance list. Never invent an id.
- value must be null unless the action is set_target or set_min_hours, and then it must be a number the user wrote. Never guess one.
- If you are unsure, answer none.`;

export type InterpretInput = {
  message: string;
  target: number | null;
  appliances: Pick<Appliance, 'id' | 'name' | 'category' | 'hoursPerDay'>[];
  /** Why the previous answer was rejected. Only set on the retry. */
  problem?: string;
};

export function buildInterpretInput({ message, target, appliances, problem }: InterpretInput): string {
  return JSON.stringify({
    message,
    current_monthly_target_pesos: target,
    appliances: appliances.map(({ id, name, category, hoursPerDay }) => ({ id, name, category, hours: hoursPerDay })),
    ...(problem ? { your_previous_answer_was_rejected_because: problem } : {}),
  });
}

const EXPLAIN_RULES = `Rules:
- Write 1 or 2 short sentences, under 30 words in all. Plain text only: no markdown, no lists, no greeting, no emoji.
- Reply in the same language as the user's message: English, or Taglish if they wrote in Taglish.
- Use ONLY the numbers that appear in the JSON facts or in the user's message. Never calculate, add, subtract, round, convert or estimate a number yourself. If a number you want is not in the facts, leave it out.
- Write pesos with the ₱ sign. Refer to appliances by name.
- Do not promise anything the facts do not show.`;

export const EXPLAIN_SYSTEM = `You are Watt Assistant, explaining a change to a household's monthly electricity plan. The JSON facts hold the plan before and after the change, computed by the planner, and the change the user asked for. Say what changed and where the bill ends up, in a friendly and direct tone. "projected_bill_change_pesos" is negative when the projected bill went down. "margin_to_target_pesos" is positive when the projected bill is under the target and negative when over. If status is "not-reachable", say the target cannot be reached and give the lowest bill ("floor_pesos").

${EXPLAIN_RULES}`;

export const ANSWER_SYSTEM = `You are Watt Assistant for a household's monthly electricity plan. Answer the user's message using only the JSON facts: the current plan and what each appliance costs per month. If the message is not about their plan or bill, reply briefly and say you can help with their bill, which appliances to cut, or a new monthly target.

${EXPLAIN_RULES}`;

const round1 = (value: number) => Math.round(value * 10) / 10;

function planFacts(plan: Plan, appliances: Appliance[]) {
  return {
    status: plan.status,
    target_pesos: Math.round(plan.target),
    current_estimate_pesos: Math.round(plan.currentEstimate),
    projected_bill_pesos: Math.round(plan.projectedBill),
    margin_to_target_pesos: Math.round(targetMargin(plan)),
    floor_pesos: Math.round(plan.floor),
    total_savings_pesos: Math.round(plan.totalCuts),
    kwh_saved: round1(plan.kwhSaved),
    cuts: plan.cuts.map((cut) => ({
      appliance: appliances.find(({ id }) => id === cut.applianceId)?.name ?? cut.applianceId,
      hours_per_day_before: round1(cut.fromHoursPerDay),
      hours_per_day_after: round1(cut.toHoursPerDay),
      saving_pesos: Math.round(cut.saving),
    })),
  };
}

function describeAction(action: PlanChangeAction, appliances: Appliance[]) {
  const names = (ids: string[]) => ids.map((id) => appliances.find((appliance) => appliance.id === id)?.name ?? id);
  switch (action.action) {
    case 'keep':
      return { type: 'keep_untouched', appliances: names(action.applianceIds) };
    case 'cut_first':
      return { type: 'cut_first', appliances: names(action.applianceIds) };
    case 'set_target':
      return { type: 'new_monthly_target', target_pesos: Math.round(action.target) };
    case 'set_min_hours':
      return { type: 'minimum_hours_per_day', appliances: names([action.applianceId]), hours_per_day: round1(action.hours) };
  }
}

/** Facts for the explain call: the user's message, what changed, and the plan before and after. */
export function buildExplainFacts(
  message: string,
  action: PlanChangeAction,
  appliances: Appliance[],
  previous: Plan | null,
  next: Plan,
) {
  return {
    user_message: message,
    change: describeAction(action, appliances),
    plan_before: previous ? planFacts(previous, appliances) : null,
    plan_after: planFacts(next, appliances),
    projected_bill_change_pesos: previous ? Math.round(projectedBillChange(previous, next)) : null,
  };
}

/** Facts for answering a question or other message from the current plan. */
export function buildAnswerFacts(message: string, plan: Plan, baseline: Baseline, appliances: Appliance[]) {
  return {
    user_message: message,
    current_plan: planFacts(plan, appliances),
    appliance_monthly_costs: baseline.items.map(({ appliance, cost, kwh }) => ({
      appliance: appliance.name,
      category: appliance.category,
      hours_per_day: round1(appliance.hoursPerDay),
      cost_pesos: Math.round(cost),
      kwh: round1(kwh),
    })),
    rate_pesos_per_kwh: Math.round(baseline.ratePerKwh * 100) / 100,
  };
}
