import { DEFAULT_CUSTOM_RATE_PER_KWH, MERALCO_RATES, REFERENCE_KWH } from '@/config/meralco-rates';
import type { BillSettings } from '@/types/energy';

import { computeBill } from './meralco-bill';

/**
 * The bill figures the optimizer needs. The rate fields are optional so a household saved before the
 * Meralco formula existed (no `rateMode`) is priced with the formula.
 */
export type BillInputs = Pick<BillSettings, 'lastBillTotal' | 'lastBillKwh'> &
  Partial<Pick<BillSettings, 'rateMode' | 'customRatePerKwh' | 'isRegisteredSenior'>>;

/** How kWh become pesos for one household. */
export type Pricing = { mode: 'meralco'; isRegisteredSenior: boolean } | { mode: 'custom'; ratePerKwh: number };

/** True when `value` is a usable kWh or peso figure from the bill. */
export const isPositive = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * Custom mode's rate: the one the household gave, else last bill total / last bill kWh (its effective
 * rate), else the default custom rate.
 */
function customRate({ customRatePerKwh, lastBillTotal, lastBillKwh }: BillInputs): number {
  if (isPositive(customRatePerKwh)) return customRatePerKwh;
  if (isPositive(lastBillTotal) && isPositive(lastBillKwh)) return lastBillTotal / lastBillKwh;
  return DEFAULT_CUSTOM_RATE_PER_KWH;
}

export function pricingFor(bill: BillInputs): Pricing {
  return bill.rateMode === 'custom'
    ? { mode: 'custom', ratePerKwh: customRate(bill) }
    : { mode: 'meralco', isRegisteredSenior: bill.isRegisteredSenior === true };
}

/** Pesos for a month of `kwh`. Meralco mode is not linear: it has fixed charges and tiers. */
export function billForKwh(kwh: number, pricing: Pricing): number {
  if (!Number.isFinite(kwh) || kwh <= 0) return 0;
  return pricing.mode === 'custom'
    ? kwh * pricing.ratePerKwh
    : computeBill(kwh, MERALCO_RATES, { isRegisteredSenior: pricing.isRegisteredSenior }).total;
}

/** Negative senior discount in pesos, or null when the formula does not apply it to this estimate. */
export function seniorDiscountForKwh(kwh: number, pricing: Pricing): number | null {
  if (!Number.isFinite(kwh) || kwh <= 0 || pricing.mode !== 'meralco' || !pricing.isRegisteredSenior) return null;
  const senior = computeBill(kwh, MERALCO_RATES, { isRegisteredSenior: true }).senior;
  return senior < 0 ? senior : null;
}

/** Pesos per kWh at `kwh` (total bill / kWh). At no consumption it is quoted at REFERENCE_KWH instead. */
export function ratePerKwhAt(kwh: number, pricing: Pricing): number {
  const at = kwh > 0 ? kwh : REFERENCE_KWH;
  return billForKwh(at, pricing) / at;
}

/**
 * The household's effective ₱ per kWh, quoted at its last bill's kWh (or REFERENCE_KWH without one).
 * For screens that show a rate when there is no appliance estimate to take it from.
 */
export function effectiveRatePerKwh(bill: BillInputs): number {
  return ratePerKwhAt(isPositive(bill.lastBillKwh) ? bill.lastBillKwh : 0, pricingFor(bill));
}
