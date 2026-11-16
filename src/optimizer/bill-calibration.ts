import type { Appliance, BillSettings } from '@/types/energy';

import { monthlyKwh } from './appliance-cost';
import { billForKwh, isPositive, pricingFor, ratePerKwhAt } from './pricing';

/** How far apart the appliance estimate and the bill may be, as a fraction of the billed kWh. */
const EXACT_VARIANCE = 0.01;
const CLOSE_VARIANCE = 0.1;

export type MatchQuality = 'exact' | 'close' | 'rough';

export type Calibration = {
  /** Pesos per kWh (bill / kWh) at the last bill's kWh, or at the appliances' kWh until one is entered. */
  ratePerKwh: number;
  /** kWh per month, summed over every appliance. */
  rawKwh: number;
  /**
   * Pesos per month: the user's bill total when they entered one, otherwise the formula's estimate
   * for the last bill's kWh (or for the appliances' kWh while there is no bill).
   */
  matchedBill: number;
  /** True when the last bill's kWh is valid, so the appliances are scaled to it. The bill total is optional. */
  isCalibrated: boolean;
  /** The bill total the user entered, or null when they left it blank. */
  yourBill: number | null;
  /** What the Meralco formula charges for the last bill's kWh. Null in custom-rate mode or without a kWh. */
  formulaEstimate: number | null;
  /** Billed kWh minus raw kWh. Negative when appliances add up to more than the bill. Null until calibrated. */
  gapKwh: number | null;
  /** |gap| as a fraction of the billed kWh (0.004 = 0.4%). Null until calibrated. */
  variance: number | null;
  match: MatchQuality | null;
};

type RateFields = Pick<BillSettings, 'rateMode' | 'customRatePerKwh'>;

/**
 * Reconciles the appliance list with the last bill. `lastBillKwh` is what calibrates; `lastBillTotal`
 * is optional and is only compared with the formula. Both are null (or not above zero) while the user
 * has not entered them.
 */
export function calibrate(
  appliances: Appliance[],
  lastBillTotal: number | null,
  lastBillKwh: number | null,
  rate: Partial<RateFields> = {},
): Calibration {
  const rawKwh = appliances.reduce((sum, appliance) => sum + monthlyKwh(appliance), 0);
  const pricing = pricingFor({ lastBillTotal, lastBillKwh, ...rate });
  const yourBill = isPositive(lastBillTotal) ? lastBillTotal : null;

  if (!isPositive(lastBillKwh)) {
    return {
      ratePerKwh: ratePerKwhAt(rawKwh, pricing),
      rawKwh,
      matchedBill: yourBill ?? billForKwh(rawKwh, pricing),
      isCalibrated: false,
      yourBill,
      formulaEstimate: null,
      gapKwh: null,
      variance: null,
      match: null,
    };
  }

  const gapKwh = lastBillKwh - rawKwh;
  const variance = Math.abs(gapKwh) / lastBillKwh;
  const estimate = billForKwh(lastBillKwh, pricing);
  return {
    ratePerKwh: ratePerKwhAt(lastBillKwh, pricing),
    rawKwh,
    matchedBill: yourBill ?? estimate,
    isCalibrated: true,
    yourBill,
    formulaEstimate: pricing.mode === 'meralco' ? estimate : null,
    gapKwh,
    variance,
    match: variance <= EXACT_VARIANCE ? 'exact' : variance <= CLOSE_VARIANCE ? 'close' : 'rough',
  };
}

/**
 * The factor that scales the appliances' summed kWh to the last bill's kWh: billed kWh / raw kWh.
 * 1 when there is no usable kWh, or no appliance usage to scale. The app computes it once, when
 * bill settings are saved, and stores it; later appliance edits move the estimate away from the bill.
 */
export function computeCalibrationFactor(
  appliances: Appliance[],
  lastBillTotal: number | null,
  lastBillKwh: number | null,
): number {
  const { rawKwh, isCalibrated } = calibrate(appliances, lastBillTotal, lastBillKwh);
  return isCalibrated && rawKwh > 0 && lastBillKwh !== null ? lastBillKwh / rawKwh : 1;
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
