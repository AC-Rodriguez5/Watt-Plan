import type { Appliance } from '@/types/energy';

import { costForKwh, effectiveRatePerKwh, monthlyKwh } from './appliance-cost';

/** How far apart the appliance estimate and the bill may be, as a fraction of the billed kWh. */
const EXACT_VARIANCE = 0.01;
const CLOSE_VARIANCE = 0.1;

export type MatchQuality = 'exact' | 'close' | 'rough';

export type Calibration = {
  /** Pesos per kWh: last bill total / last bill kWh, or the default rate when no bill is entered. */
  ratePerKwh: number;
  /** kWh per month, summed over every appliance. */
  rawKwh: number;
  /** Pesos per month once the estimate is matched to the bill. Equals the last bill total when one is entered. */
  matchedBill: number;
  /** True when both bill figures are valid, so the rate comes from the user's own bill. */
  isCalibrated: boolean;
  /** Billed kWh minus raw kWh. Negative when appliances add up to more than the bill. Null until calibrated. */
  gapKwh: number | null;
  /** |gap| as a fraction of the billed kWh (0.004 = 0.4%). Null until calibrated. */
  variance: number | null;
  match: MatchQuality | null;
};

/**
 * Reconciles the appliance list with the last bill. `lastBillTotal` and `lastBillKwh`
 * are null (or not above zero) while the user has not entered them.
 */
export function calibrate(
  appliances: Appliance[],
  lastBillTotal: number | null,
  lastBillKwh: number | null,
): Calibration {
  const rawKwh = appliances.reduce((sum, appliance) => sum + monthlyKwh(appliance), 0);
  const ratePerKwh = effectiveRatePerKwh({ lastBillTotal, lastBillKwh });
  const isCalibrated = lastBillTotal !== null && lastBillKwh !== null && lastBillTotal > 0 && lastBillKwh > 0;

  if (!isCalibrated) {
    return {
      ratePerKwh,
      rawKwh,
      matchedBill: costForKwh(rawKwh, ratePerKwh),
      isCalibrated: false,
      gapKwh: null,
      variance: null,
      match: null,
    };
  }

  const gapKwh = lastBillKwh - rawKwh;
  const variance = Math.abs(gapKwh) / lastBillKwh;
  return {
    ratePerKwh,
    rawKwh,
    matchedBill: lastBillTotal,
    isCalibrated: true,
    gapKwh,
    variance,
    match: variance <= EXACT_VARIANCE ? 'exact' : variance <= CLOSE_VARIANCE ? 'close' : 'rough',
  };
}

/** A charge as a fraction of the bill total (0.544 = 54.4%). Null when either figure is missing. */
export function chargeShare(charge: number | null, total: number | null): number | null {
  if (charge === null || total === null || total <= 0) return null;
  return charge / total;
}

/** Sum of the itemized charges, ignoring blank ones. */
export function sumCharges(charges: (number | null)[]): number {
  return charges.reduce<number>((sum, charge) => sum + (charge ?? 0), 0);
}

/** True when the itemized charges add up to the bill total, to the centavo. */
export function chargesMatchTotal(charges: (number | null)[], total: number | null): boolean {
  return total !== null && Math.abs(sumCharges(charges) - total) < 0.005;
}
