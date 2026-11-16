import type { BillSettings } from '@/types/energy';

import { parseNonNegative } from './appliance-form';
import { formatAmount } from './format';

/** Raw text of the bill settings screen, as typed. */
export type BillField = 'total' | 'kwh' | 'generation' | 'distribution' | 'taxes';
export type BillFormValues = Record<BillField, string>;
export type BillFormErrors = Partial<Record<BillField, string>>;

type BillFigures = Pick<
  BillSettings,
  'lastBillTotal' | 'lastBillKwh' | 'generationCharge' | 'distributionCharge' | 'taxesCharge'
>;

const GROUPED_NUMBER = /^\d{1,3}(,\d{3})+(\.\d*)?$/;

/** Like parseNonNegative, but also accepts thousands separators ("3,400.00"). */
export function parseAmount(text: string): { value: number } | { error: string } {
  const trimmed = text.trim();
  return parseNonNegative(GROUPED_NUMBER.test(trimmed) ? trimmed.replace(/,/g, '') : trimmed);
}

/** The number a field currently holds, or null while it is blank or not a valid amount. */
export function amountOrNull(text: string): number | null {
  const parsed = parseAmount(text);
  return 'value' in parsed ? parsed.value : null;
}

/** Normalizes a valid amount to "3,400.00" and leaves anything else as typed. */
export function tidyAmount(text: string): string {
  const value = amountOrNull(text);
  return value === null ? text : formatAmount(value);
}

export function billFormFromSettings(bill: BillFigures): BillFormValues {
  const amount = (value: number | null) => (value === null ? '' : formatAmount(value));
  return {
    total: amount(bill.lastBillTotal),
    kwh: bill.lastBillKwh === null ? '' : String(bill.lastBillKwh),
    generation: amount(bill.generationCharge),
    distribution: amount(bill.distributionCharge),
    taxes: amount(bill.taxesCharge),
  };
}

export type BillValidation = { ok: true; value: BillFigures } | { ok: false; errors: BillFormErrors };

/** The kWh is required and above zero. The total, if given, is above zero too. The three charges are optional. */
export function validateBillForm(values: BillFormValues): BillValidation {
  const errors: BillFormErrors = {};

  /** A field that must hold an amount above zero. `blank` is the error for an empty one. */
  const required = (field: 'total' | 'kwh', blank: string): number | null => {
    if (values[field].trim() === '') {
      errors[field] = blank;
      return null;
    }
    const parsed = parseAmount(values[field]);
    if ('error' in parsed) {
      errors[field] = parsed.error;
      return null;
    }
    if (parsed.value <= 0) {
      errors[field] = 'Must be more than 0';
      return null;
    }
    return parsed.value;
  };

  const optional = (field: 'generation' | 'distribution' | 'taxes'): number | null => {
    if (values[field].trim() === '') return null;
    const parsed = parseAmount(values[field]);
    if ('error' in parsed) {
      errors[field] = parsed.error;
      return null;
    }
    return parsed.value;
  };

  const lastBillTotal = values.total.trim() === '' ? null : required('total', '');
  const lastBillKwh = required('kwh', 'Enter the kWh used');
  const generationCharge = optional('generation');
  const distributionCharge = optional('distribution');
  const taxesCharge = optional('taxes');

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { lastBillTotal, lastBillKwh, generationCharge, distributionCharge, taxesCharge } };
}
