import type { ChatAction } from '@/types/chat';
import type { Appliance } from '@/types/energy';

import { generate } from './llm';
import { buildInterpretInput, INTERPRET_ACTIONS, INTERPRET_SCHEMA, INTERPRET_SYSTEM } from './prompts';

/** Sane range for a monthly bill target, in pesos. */
export const MIN_TARGET = 100;
export const MAX_TARGET = 100_000;
export const MAX_HOURS_PER_DAY = 24;

export type Validation = { ok: true; action: ChatAction } | { ok: false; reason: string };

const fail = (reason: string): Validation => ({ ok: false, reason });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Checks the model's JSON against the household before anything is applied: the action must be a
 * listed one, appliance ids must exist, and numbers must be sane. Only set_target and
 * set_min_hours keep a number. Any `value` sent with another action is dropped.
 */
export function validateInterpretation(raw: unknown, appliances: Appliance[]): Validation {
  if (!isRecord(raw)) return fail('the answer was not a JSON object');

  const { action, appliance_ids: rawIds, value } = raw;
  if (typeof action !== 'string' || !(INTERPRET_ACTIONS as readonly string[]).includes(action)) {
    return fail(`action must be one of: ${INTERPRET_ACTIONS.join(', ')}`);
  }

  if (action === 'question' || action === 'none') return { ok: true, action: { action } as ChatAction };

  if (action === 'set_target') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fail('set_target needs a numeric value in pesos');
    if (value < MIN_TARGET || value > MAX_TARGET) return fail(`the target must be between ${MIN_TARGET} and ${MAX_TARGET} pesos`);
    return { ok: true, action: { action, target: Math.round(value) } };
  }

  if (!Array.isArray(rawIds) || !rawIds.every((id) => typeof id === 'string')) return fail('appliance_ids must be a list of strings');
  const ids = [...new Set(rawIds as string[])];
  const unknown = ids.find((id) => !appliances.some((appliance) => appliance.id === id));
  if (unknown !== undefined) return fail(`"${unknown}" is not an id in the appliance list`);

  if (action === 'keep' || action === 'cut_first') {
    if (ids.length === 0) return fail(`${action} needs at least one appliance id`);
    return { ok: true, action: { action, applianceIds: ids } };
  }

  // set_min_hours
  if (ids.length !== 1) return fail('set_min_hours needs exactly one appliance id');
  const appliance = appliances.find(({ id }) => id === ids[0])!;
  if (appliance.category === 'luxury') return fail('luxury appliances have no minimum hours');
  if (typeof value !== 'number' || !Number.isFinite(value)) return fail('set_min_hours needs a numeric value in hours per day');
  if (value < 0 || value > MAX_HOURS_PER_DAY) return fail(`hours per day must be between 0 and ${MAX_HOURS_PER_DAY}`);
  if (value > appliance.hoursPerDay) return fail(`the minimum cannot be more than the ${appliance.hoursPerDay} hours it runs now`);
  return { ok: true, action: { action: 'set_min_hours', applianceId: appliance.id, hours: value } };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export type Interpretation = { kind: 'ok'; action: ChatAction } | { kind: 'invalid' };

/**
 * The interpret call: the user's message, the appliance list and the current target go in, a
 * validated action comes out. An invalid answer is retried once, then reported as `invalid`.
 * Throws AiUnavailableError when the model cannot be reached (no retry: the network is the problem).
 */
export async function interpretMessage(message: string, appliances: Appliance[], target: number | null): Promise<Interpretation> {
  let problem: string | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await generate({
      kind: 'interpret',
      systemInstruction: INTERPRET_SYSTEM,
      input: buildInterpretInput({ message, target, appliances, problem }),
      schema: INTERPRET_SCHEMA,
    });
    const parsed = parseJson(text);
    const result = parsed === undefined ? fail('the answer was not valid JSON') : validateInterpretation(parsed, appliances);
    if (result.ok) return { kind: 'ok', action: result.action };
    problem = result.reason;
  }
  return { kind: 'invalid' };
}
