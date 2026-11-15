import { monthlyCost } from '@/optimizer/appliance-cost';
import type { Appliance, Plan, PlanConstraints } from '@/types/energy';

/**
 * MOCK. Stands in for the two LLM calls described in CLAUDE.md until the real ones exist:
 *   1. interpretMessage: user message -> constraint JSON
 *   2. explainPlan: plan -> reply text
 * Neither computes a number. Every figure on screen comes from the optimizer.
 */

export type Interpretation =
  | { kind: 'constrain'; keep: string[]; cutFirst: string[] }
  | { kind: 'question' }
  | { kind: 'unknown' };

const KEEP_CUES = /\b(can'?t|cannot|don'?t|do not|keep|leave|spare|stay|stays|without|need)\b/i;
const CUT_CUES = /\b(cut|reduce|lower|less|more)\b/i;
const QUESTION_CUES = /\b(why|how|what)\b|\?/i;

/** Words in an appliance name that identify it, e.g. "Stand Fan" -> ["stand", "fan"]. */
function nameWords({ name }: Appliance): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => word.length >= 2);
}

function mentionedAppliances(message: string, appliances: Appliance[]): Appliance[] {
  const words = new Set(message.toLowerCase().split(/[^a-z]+/));
  return appliances.filter((appliance) => nameWords(appliance).some((word) => words.has(word)));
}

/** Mock of "turn the user's message into constraint JSON". */
export function interpretMessage(message: string, appliances: Appliance[]): Interpretation {
  const mentioned = mentionedAppliances(message, appliances).map(({ id }) => id);
  if (mentioned.length > 0 && KEEP_CUES.test(message)) return { kind: 'constrain', keep: mentioned, cutFirst: [] };
  if (mentioned.length > 0 && CUT_CUES.test(message)) return { kind: 'constrain', keep: [], cutFirst: mentioned };
  if (QUESTION_CUES.test(message)) return { kind: 'question' };
  return { kind: 'unknown' };
}

/** Folds a newly asked-for change into the constraints already in force. An appliance is either kept or cut first, never both. */
export function mergeConstraints(current: PlanConstraints, change: { keep: string[]; cutFirst: string[] }): PlanConstraints {
  return {
    keep: [...current.keep.filter((id) => !change.cutFirst.includes(id)), ...change.keep.filter((id) => !current.keep.includes(id))],
    cutFirst: [
      ...current.cutFirst.filter((id) => !change.keep.includes(id)),
      ...change.cutFirst.filter((id) => !current.cutFirst.includes(id)),
    ],
  };
}

function names(ids: string[], appliances: Appliance[]): string {
  const found = ids.flatMap((id) => appliances.find((appliance) => appliance.id === id)?.name ?? []);
  if (found.length <= 1) return found[0] ?? 'that appliance';
  return `${found.slice(0, -1).join(', ')} and ${found[found.length - 1]}`;
}

/** Mock of "explain the plan". Names appliances only; the receipt carries the numbers. */
export function explainRevision(
  change: { keep: string[]; cutFirst: string[] },
  plan: Plan,
  appliances: Appliance[],
): string {
  const cutNames = names(
    plan.cuts.map(({ applianceId }) => applianceId),
    appliances,
  );
  const opening =
    change.keep.length > 0
      ? `Okay, ${names(change.keep, appliances)} stays as it is.`
      : `Okay, I'll cut ${names(change.cutFirst, appliances)} first.`;
  if (plan.status === 'not-reachable') {
    return `${opening} I couldn't reach your target without it, so I cut ${cutNames} as far as they go.`;
  }
  return `${opening} I moved the cut to ${cutNames}.`;
}

/** Mock answer to "why is my bill high?": points at the costliest appliance. */
export function explainBill(appliances: Appliance[], ratePerKwh: number): string {
  const costliest = [...appliances].sort((a, b) => monthlyCost(b, ratePerKwh) - monthlyCost(a, ratePerKwh))[0];
  if (!costliest) return 'Add your appliances first and I can show you where the bill goes.';
  return `${costliest.name} is the biggest part of your bill. Trimming its hours saves the most.`;
}

export const UNKNOWN_REPLY = `I can only change appliance hours for now. Try naming one, like "I can't cut the fan".`;
export const NO_CHANGE_REPLY = 'The plan already does that, so nothing changed.';
export const NO_PLAN_REPLY = 'I need your appliances and a monthly target before I can plan.';
