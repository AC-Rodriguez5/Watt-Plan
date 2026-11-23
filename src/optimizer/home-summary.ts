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
  /** Pesos per kWh: the estimated bill / kWh. */
  ratePerKwh: number;
  /** Target in pesos, or null when none is set. */
  target: number | null;
  /** Pesos over the target. 0 when at or under it. */
  excess: number;
  /** Pesos under the target. 0 when at or over it, or when there is no target. */
  headroom: number;
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
  /** The bill split for the "Where it goes" ring: the costliest appliances, then the rest. Shares add up to 1. */
  slices: BillSlice[];
  /**
   * How close the bill is to the target, 0 to 1, for the "Bill journey" track: target / estimate, and 1
   * once at or under the target. Cutting moves it toward 1. 0 when there is no target.
   */
  targetProgress: number;
};

export type BillSlice = {
  /** Appliance name, or "Others" for everything after the costliest ones. */
  label: string;
  /** Null for "Others". */
  applianceId: string | null;
  /** Pesos per month. */
  cost: number;
  /** Share of the estimated bill, 0 to 1. */
  share: number;
};

/** Slices for the ring: every appliance when there are three or fewer, else the top two and "Others". */
function billSlices(items: Baseline['items'], total: number): BillSlice[] {
  if (!(total > 0)) return [];
  const ranked = [...items].filter(({ cost }) => cost > 0).sort((a, b) => b.cost - a.cost);
  const named = ranked.length <= 3 ? ranked : ranked.slice(0, 2);
  const slices: BillSlice[] = named.map(({ appliance, cost }) => ({
    label: appliance.name,
    applianceId: appliance.id,
    cost,
    share: cost / total,
  }));
  const rest = ranked.slice(named.length).reduce((sum, { cost }) => sum + cost, 0);
  if (rest > 0) slices.push({ label: 'Others', applianceId: null, cost: rest, share: rest / total });
  return slices;
}

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
  const headroom = hasTarget ? Math.max(0, target - estimatedBill) : 0;

  return {
    estimatedBill,
    kwh,
    co2Kg: kwh * CO2_KG_PER_KWH,
    ratePerKwh,
    target,
    excess,
    headroom,
    overGoal: hasTarget ? excess / target : 0,
    barFill: !hasTarget ? 0 : Math.min(1, estimatedBill / target),
    goalShare: hasTarget && estimatedBill > target ? target / estimatedBill : 1,
    tip: oneHourTip(baseline),
    isOverTarget: excess > 0,
    topCosts,
    applianceCount: items.length,
    slices: billSlices(items, estimatedBill),
    targetProgress: !hasTarget ? 0 : estimatedBill <= target ? 1 : target / estimatedBill,
  };
}

/**
 * One less hour a day on the costliest non-essential appliance, priced from the baseline. Null if none.
 * Shown on Home and on the Appliances tab.
 */
export function oneHourTip({ items }: Baseline): HomeSummary['tip'] {
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

/** True once there is at least one appliance and a last bill kWh to calibrate against (the bill total is optional). */
export function isHomeSetUp(appliances: Appliance[], bill: BillSettings): boolean {
  return appliances.length > 0 && bill.lastBillKwh !== null;
}
