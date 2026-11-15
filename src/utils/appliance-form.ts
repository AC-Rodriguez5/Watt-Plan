import type { ApplianceUsage } from '@/optimizer/appliance-cost';
import type { Appliance, ApplianceCategory } from '@/types/energy';

/** Raw text of the add/edit sheet, as typed. */
export type ApplianceFormValues = {
  name: string;
  watts: string;
  hoursPerDay: string;
  daysPerWeek: string;
  minHoursPerDay: string;
  category: ApplianceCategory;
};

export type ApplianceField = 'name' | 'watts' | 'hoursPerDay' | 'daysPerWeek' | 'minHoursPerDay';
export type ApplianceFormErrors = Partial<Record<ApplianceField, string>>;

export const MAX_HOURS_PER_DAY = 24;
export const MAX_DAYS_PER_WEEK = 7;

const NUMBER_PATTERN = /^(\d+\.?\d*|\.\d+)$/;

type Parsed = { value: number } | { error: string };

/** Accepts plain non-negative decimals only: no signs, exponents, hex or thousands separators. */
export function parseNonNegative(text: string): Parsed {
  const trimmed = text.trim();
  if (trimmed === '') return { error: 'Enter a number' };
  if (/^-\s*[\d.]/.test(trimmed)) return { error: "Can't be negative" };
  if (!NUMBER_PATTERN.test(trimmed)) return { error: 'Enter a number' };
  return { value: Number(trimmed) };
}

function parseHours(text: string): Parsed {
  const parsed = parseNonNegative(text);
  if ('error' in parsed) return parsed;
  if (parsed.value > MAX_HOURS_PER_DAY) return { error: `Can't be more than ${MAX_HOURS_PER_DAY} hours` };
  return parsed;
}

function parseDays(text: string): Parsed {
  const parsed = parseNonNegative(text);
  if ('error' in parsed) return parsed;
  if (!Number.isInteger(parsed.value) || parsed.value < 1 || parsed.value > MAX_DAYS_PER_WEEK) {
    return { error: `Enter 1 to ${MAX_DAYS_PER_WEEK} days` };
  }
  return parsed;
}

export type ValidationResult =
  | { ok: true; value: Omit<Appliance, 'id' | 'note'> }
  | { ok: false; errors: ApplianceFormErrors };

/** Checks every field and, when all are valid, returns the appliance data to save. */
export function validateApplianceForm(values: ApplianceFormValues): ValidationResult {
  const errors: ApplianceFormErrors = {};

  const name = values.name.trim();
  if (name === '') errors.name = 'Enter a name';

  const watts = parseNonNegative(values.watts);
  if ('error' in watts) errors.watts = watts.error;

  const hours = parseHours(values.hoursPerDay);
  if ('error' in hours) errors.hoursPerDay = hours.error;

  const days = parseDays(values.daysPerWeek);
  if ('error' in days) errors.daysPerWeek = days.error;

  // Luxury appliances have no floor, so the field is neither shown nor checked.
  let minHours: number | undefined;
  if (values.category !== 'luxury') {
    const min = parseHours(values.minHoursPerDay);
    if ('error' in min) {
      errors.minHoursPerDay = min.error;
    } else if ('value' in hours && min.value > hours.value) {
      errors.minHoursPerDay = "Can't be more than hours per day";
    } else {
      minHours = min.value;
    }
  }

  if (Object.keys(errors).length > 0 || !('value' in watts) || !('value' in hours) || !('value' in days)) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      name,
      category: values.category,
      watts: watts.value,
      hoursPerDay: hours.value,
      daysPerWeek: days.value,
      minHoursPerDay: minHours,
    },
  };
}

/** Usage for the live estimate, or null while watts, hours or days are not yet valid. */
export function usageFromForm(values: ApplianceFormValues): ApplianceUsage | null {
  const watts = parseNonNegative(values.watts);
  const hours = parseHours(values.hoursPerDay);
  const days = parseDays(values.daysPerWeek);
  if (!('value' in watts) || !('value' in hours) || !('value' in days)) return null;
  return { watts: watts.value, hoursPerDay: hours.value, daysPerWeek: days.value };
}
