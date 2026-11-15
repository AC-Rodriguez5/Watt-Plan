import type { Appliance, BillSettings } from '@/types/energy';

import { CO2_KG_PER_KWH } from './appliance-cost';
import type { Baseline } from './optimizer';

export { CO2_KG_PER_KWH };

export type CostlyAppliance = {
  appliance: Appliance;
  /** Pesos per month. */
  cost: number;
  /** 0 to 1, relative to the costliest appliance, for the bar under each row. */
  share: number;
};

export type HomeSummary = {
  /** Pesos per month: the optimizer's baseline, which adds up to the last bill once one is entered. */
  estimatedBill: number;
  /** kWh per month across all appliances. */
  kwh: number;
  /** kg of CO₂ per month. */
  co2Kg: number;
  /** Pesos per kWh used for every figure above. */
  ratePerKwh: number;
  /** Target in pesos, or null when none is set. */
  target: number | null;
  /** Pesos over the target. 0 when at or under it. */
  excess: number;
  /** Excess as a fraction of the target (0.7 = "+70% of goal"). 0 when under it or no target. */
  overGoal: number;
  /** How much of the progress track is filled, 0 to 1: all of it once over target, otherwise estimate / target. */
  barFill: number;
  /** Share of the filled track in the "Goal" color, 0 to 1. The rest is the "Excess" slice. */
  goalShare: number;
  /** Cheapest-to-act-on hint: one less hour a day on the costliest non-essential appliance. Null if none. */
  tip: { applianceName: string; saving: number } | null;
  isOverTarget: boolean;
  /** Top three appliances by monthly cost, costliest first. */
  topCosts: CostlyAppliance[];
  applianceCount: number;
};

/**
 * Home tab figures, taken from the optimizer's baseline (calibrated to the last bill) so Home and
 * the Plan screen always agree on the estimated bill and on each appliance's cost.
 */
export function summarizeHome(baseline: Baseline, target: number | null): HomeSummary {
  const { ratePerKwh, items, kwh, cost: estimatedBill } = baseline;

  const ranked = [...items].sort((a, b) => b.cost - a.cost).slice(0, 3);
  const maxCost = ranked[0]?.cost ?? 0;
  const topCosts = ranked.map(({ appliance, cost }) => ({
    appliance,
    cost,
    share: maxCost > 0 ? cost / maxCost : 0,
  }));

  const hasTarget = target !== null && target > 0;
  const excess = hasTarget ? Math.max(0, estimatedBill - target) : 0;

  return {
    estimatedBill,
    kwh,
    co2Kg: kwh * CO2_KG_PER_KWH,
    ratePerKwh,
    target,
    excess,
    overGoal: hasTarget ? excess / target : 0,
    barFill: !hasTarget ? 0 : Math.min(1, estimatedBill / target),
    goalShare: hasTarget && estimatedBill > target ? target / estimatedBill : 1,
    tip: oneHourTip(baseline),
    isOverTarget: excess > 0,
    topCosts,
    applianceCount: items.length,
  };
}

/** One less hour a day on the costliest non-essential appliance, priced from the baseline. Null if none. */
function oneHourTip({ items }: Baseline): HomeSummary['tip'] {
  const candidate = items
    .filter(({ appliance }) => appliance.category !== 'essential' && appliance.hoursPerDay >= 1)
    .sort((a, b) => b.cost - a.cost)[0];
  if (!candidate) return null;
  return { applianceName: candidate.appliance.name, saving: candidate.costPerDailyHour };
}

/** kWh per day across all appliances, averaging each one's days-per-week. */
export function averageDailyKwh(appliances: Appliance[]): number {
  return appliances.reduce((sum, { watts, hoursPerDay, daysPerWeek }) => sum + (watts * hoursPerDay * daysPerWeek) / 7 / 1000, 0);
}

/** True once there is at least one appliance and a last bill (total and kWh) to derive the rate from. */
export function isHomeSetUp(appliances: Appliance[], bill: BillSettings): boolean {
  return appliances.length > 0 && bill.lastBillTotal !== null && bill.lastBillKwh !== null;
}
