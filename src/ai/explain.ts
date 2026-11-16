import type { Baseline } from '@/optimizer/optimizer';
import type { PlanChangeAction } from '@/types/chat';
import type { Appliance, Plan } from '@/types/energy';

import { generate } from './gemini';
import { ANSWER_SYSTEM, buildAnswerFacts, buildExplainFacts, EXPLAIN_SYSTEM } from './prompts';
import { answerTemplate, revisionTemplate } from './templates';

/** Every number written in `text`, with thousands separators removed: "₱1,240.50" -> 1240.5. */
function numbersIn(text: string): number[] {
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((token) => Number(token.replace(/,/g, '')));
}

/**
 * True when the model's text uses only numbers it was given: those in the facts, or in the user's
 * message. The model is told never to calculate, and this enforces it. Text that fails is dropped
 * for a template, so an invented figure never reaches the screen.
 */
export function usesOnlyGivenNumbers(text: string, facts: object): boolean {
  const allowed = new Set(numbersIn(JSON.stringify(facts)));
  return numbersIn(text).every((value) => allowed.has(value));
}

/** One call for a plain-text reply. Returns null on any failure, so the caller uses its template. */
async function writeReply(systemInstruction: string, facts: object): Promise<string | null> {
  try {
    const text = (await generate({ kind: 'explain', systemInstruction, input: JSON.stringify(facts) })).trim();
    return text !== '' && usesOnlyGivenNumbers(text, facts) ? text : null;
  } catch {
    return null;
  }
}

/** The explain call: the old and new plan from the optimizer go in, 1 or 2 short sentences come out. Never throws. */
export async function explainPlanChange(
  message: string,
  action: PlanChangeAction,
  appliances: Appliance[],
  previous: Plan | null,
  next: Plan,
): Promise<string> {
  const reply = await writeReply(EXPLAIN_SYSTEM, buildExplainFacts(message, action, appliances, previous, next));
  return reply ?? revisionTemplate(action, next, appliances);
}

/** Answers a question (or any message that changes nothing) from the current plan. Never throws. */
export async function answerFromPlan(
  message: string,
  kind: 'question' | 'none',
  plan: Plan,
  baseline: Baseline,
  appliances: Appliance[],
): Promise<string> {
  const reply = await writeReply(ANSWER_SYSTEM, buildAnswerFacts(message, plan, baseline, appliances));
  return reply ?? answerTemplate(kind, plan, baseline);
}
