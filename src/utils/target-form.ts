import { parseAmount } from './bill-form';

export type TargetValidation = { ok: true; value: number } | { ok: false; error: string };

/** The monthly target is required and above zero. Accepts thousands separators ("2,000.00"). */
export function validateTarget(text: string): TargetValidation {
  if (text.trim() === '') return { ok: false, error: 'Enter your monthly target' };
  const parsed = parseAmount(text);
  if ('error' in parsed) return { ok: false, error: parsed.error };
  if (parsed.value <= 0) return { ok: false, error: 'Must be more than 0' };
  return { ok: true, value: parsed.value };
}
