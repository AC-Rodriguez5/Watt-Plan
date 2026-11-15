import { costliestItem, type Baseline } from '@/optimizer/optimizer';
import { targetMargin } from '@/optimizer/plan-revision';
import type { PlanChangeAction } from '@/types/chat';
import type { Appliance, Plan } from '@/types/energy';
import { formatPeso } from '@/utils/format';

/**
 * Fixed replies, used when the AI is unavailable or its answer is rejected. Every figure comes
 * from the optimizer's plan; nothing here calculates one.
 */

export const DIDNT_CATCH_REPLY = "I didn't catch that, try rephrasing.";
export const NO_CHANGE_REPLY = 'The plan already does that, so nothing changed.';
export const NO_PLAN_REPLY = 'I need your appliances and a monthly target before I can plan.';
export const NOTHING_TO_ANSWER_REPLY = 'I can change your plan, like keeping an appliance as it is or setting a new target. Try "I can\'t cut the fan".';

function names(ids: string[], appliances: Appliance[]): string {
  const found = ids.flatMap((id) => appliances.find((appliance) => appliance.id === id)?.name ?? []);
  if (found.length <= 1) return found[0] ?? 'that appliance';
  return `${found.slice(0, -1).join(', ')} and ${found[found.length - 1]}`;
}

function opening(action: PlanChangeAction, appliances: Appliance[]): string {
  switch (action.action) {
    case 'keep':
      return `Okay, ${names(action.applianceIds, appliances)} stays as it is.`;
    case 'cut_first':
      return `Okay, I'll cut ${names(action.applianceIds, appliances)} first.`;
    case 'set_target':
      return `Okay, your target is now ${formatPeso(action.target)}.`;
    case 'set_min_hours':
      return `Okay, ${names([action.applianceId], appliances)} will run at least ${Number(action.hours.toFixed(1))} h a day.`;
  }
}

/** Explanation of a plan change when the model could not write one. */
export function revisionTemplate(action: PlanChangeAction, plan: Plan, appliances: Appliance[]): string {
  if (plan.status === 'not-reachable') {
    return `${opening(action, appliances)} I can't reach your ${formatPeso(plan.target)} target, so I cut as far as I can. The lowest bill is ${formatPeso(plan.floor)}.`;
  }
  const margin = targetMargin(plan);
  return `${opening(action, appliances)} Your projected bill is now ${formatPeso(plan.projectedBill)}, ${formatPeso(margin)} under your ${formatPeso(plan.target)} target.`;
}

/** Answer to a question, or to a message that is neither, when the model could not write one. */
export function answerTemplate(action: 'question' | 'none', plan: Plan, baseline: Baseline): string {
  if (action === 'none') return NOTHING_TO_ANSWER_REPLY;
  const biggest = costliestItem(baseline);
  const summary = `Your estimated bill is ${formatPeso(plan.currentEstimate)} against a ${formatPeso(plan.target)} target.`;
  return biggest ? `${summary} ${biggest.appliance.name} is the biggest part of it.` : summary;
}
