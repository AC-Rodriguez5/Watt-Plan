import {
  NO_CONSTRAINTS,
  type Appliance,
  type ApplianceCategory,
  type BillSettings,
  type Plan,
  type PlanConstraints,
  type PlanCut,
  type PlanMode,
} from '@/types/energy';

import { CO2_KG_PER_KWH, costForKwh, monthlyKwh, type ApplianceUsage } from './appliance-cost';
import { calibrate } from './bill-calibration';

/** Cuts move in steps of this many hours a day, so the receipt shows tidy figures. */
export const HOUR_STEP = 0.5;

/** Rounding slack for peso and hour comparisons. */
const EPSILON = 1e-6;

/**
 * Plain TypeScript, no AI, no network. Every peso and kWh figure in the app comes from here.
 *
 * The model: each appliance's kWh is scaled by one calibration factor (billed kWh / summed appliance
 * kWh at the time the bill settings were saved), so the baseline adds up to the last bill until the
 * appliances change. Cutting hours then removes the same share of that appliance's baseline cost.
 */

export type ApplianceBaseline = {
  appliance: Appliance;
  /** kWh per month, scaled by the calibration factor. */
  kwh: number;
  /** Pesos per month at the household rate. */
  cost: number;
  /** Pesos per month for each hour a day the appliance runs. */
  costPerDailyHour: number;
};

export type Baseline = {
  /** Pesos per kWh: last bill total / last bill kWh, or the default rate when no bill is entered. */
  ratePerKwh: number;
  /** The stored factor (billed kWh / summed appliance kWh when the bill was saved). 1 when there is no bill. */
  calibrationFactor: number;
  isCalibrated: boolean;
  /** kWh per month across all appliances, scaled. */
  kwh: number;
  /** Pesos per month across all appliances. Equals the last bill total only while the appliances match the saved calibration. */
  cost: number;
  items: ApplianceBaseline[];
};

/**
 * Monthly kWh and cost per appliance, each scaled by `storedFactor`: the factor computed when the
 * bill settings were last saved (see computeCalibrationFactor). It is not recomputed here, so adding
 * or editing an appliance changes the estimate instead of being scaled back to the last bill.
 * With no bill to calibrate against the factor is 1, whatever is passed.
 */
export function buildBaseline(
  appliances: Appliance[],
  bill: Pick<BillSettings, 'lastBillTotal' | 'lastBillKwh'>,
  storedFactor: number,
): Baseline {
  const { ratePerKwh, isCalibrated } = calibrate(appliances, bill.lastBillTotal, bill.lastBillKwh);
  const calibrationFactor = isCalibrated ? storedFactor : 1;

  const items = appliances.map<ApplianceBaseline>((appliance) => {
    const kwh = monthlyKwh(appliance) * calibrationFactor;
    return {
      appliance,
      kwh,
      cost: costForKwh(kwh, ratePerKwh),
      costPerDailyHour: costForKwh(monthlyKwh({ ...appliance, hoursPerDay: 1 }) * calibrationFactor, ratePerKwh),
    };
  });

  return {
    ratePerKwh,
    calibrationFactor,
    isCalibrated,
    kwh: items.reduce((sum, { kwh }) => sum + kwh, 0),
    cost: items.reduce((sum, { cost }) => sum + cost, 0),
    items,
  };
}

/**
 * One appliance's monthly kWh and cost, scaled exactly like `buildBaseline` scales it, so the add/edit
 * sheet shows the figure the appliance list will show once it is saved. `ratePerKwh` is the rate used.
 */
export function estimateAppliance(
  usage: ApplianceUsage,
  bill: Pick<BillSettings, 'lastBillTotal' | 'lastBillKwh'>,
  storedFactor: number,
): { kwh: number; cost: number; ratePerKwh: number } {
  const { ratePerKwh, isCalibrated } = calibrate([], bill.lastBillTotal, bill.lastBillKwh);
  const kwh = monthlyKwh(usage) * (isCalibrated ? storedFactor : 1);
  return { kwh, cost: costForKwh(kwh, ratePerKwh), ratePerKwh };
}

/**
 * Lowest hours per day an appliance may run at.
 * - Appliances in `keep` stay as they are.
 * - Luxury can go to zero.
 * - Essential and flexible stop at their minimum hours, and are not cut at all when none is set.
 */
export function floorHours(appliance: Appliance, keep: string[] = []): number {
  if (keep.includes(appliance.id)) return appliance.hoursPerDay;
  if (appliance.category === 'luxury') return 0;
  return Math.max(0, Math.min(appliance.hoursPerDay, appliance.minHoursPerDay ?? appliance.hoursPerDay));
}

/** The lowest bill the household can reach: every appliance at its floor. Pesos per month. */
export function lowestBill(baseline: Baseline, constraints: PlanConstraints = NO_CONSTRAINTS): number {
  return baseline.items.reduce((sum, { appliance, costPerDailyHour }) => sum + costPerDailyHour * floorHours(appliance, constraints.keep), 0);
}

/**
 * How the two strategies weigh a cut. A cut is chosen for its pesos saved per unit of sacrifice.
 *
 * - `changePenalty`: extra sacrifice for the first cut to an appliance. Large, it makes the planner
 *   finish one appliance before it touches another, so fewer appliances change.
 * - `convexity`: how much each further hour hurts as more of the appliance's use is gone. Large, it
 *   spreads the cuts thinly over many appliances.
 */
type Weights = { changePenalty: number; convexity: number };

const STRATEGY_WEIGHTS: Record<PlanMode, Weights> = {
  'fewest-changes': { changePenalty: 2, convexity: 0 },
  'comfort-first': { changePenalty: 0, convexity: 3 },
};

/** Sacrifice per hour cut, by category. Only used to rank appliances inside one category. */
const CATEGORY_WEIGHT: Record<ApplianceCategory, number> = { luxury: 1, flexible: 3, essential: 9 };

/** Categories are cut in this order. Appliances the user asked to cut first go before all of them. */
const CATEGORY_ORDER: ApplianceCategory[] = ['luxury', 'flexible', 'essential'];

type CutState = {
  baseline: ApplianceBaseline;
  floor: number;
  /** Hours per day cut so far. */
  cut: number;
};

/**
 * Plans the cuts that bring the household's bill down to `target`.
 *
 * Luxury is cut first, then flexible, then essential (only down to its minimum hours, and only
 * when it has one). Inside a category the cut with the best pesos saved per sacrifice goes first.
 * Appliances in `constraints.cutFirst` go before every category; `constraints.keep` are never cut.
 *
 * When the target is below the floor the plan cuts everything to its floor, reports
 * `not-reachable`, and `projectedBill` is that floor: the lowest realistic bill.
 *
 * Returns null when there is nothing to plan: no target, or no appliances.
 */
export function optimize(
  appliances: Appliance[],
  bill: Pick<BillSettings, 'lastBillTotal' | 'lastBillKwh'>,
  calibrationFactor: number,
  target: number | null,
  mode: PlanMode,
  constraints: PlanConstraints = NO_CONSTRAINTS,
): Plan | null {
  if (target === null || !(target > 0) || appliances.length === 0) return null;

  const baseline = buildBaseline(appliances, bill, calibrationFactor);
  const currentEstimate = baseline.cost;
  const floor = lowestBill(baseline, constraints);
  const needed = currentEstimate - target;

  const states = baseline.items.map<CutState>((item) => ({
    baseline: item,
    floor: floorHours(item.appliance, constraints.keep),
    cut: 0,
  }));

  if (needed > EPSILON) selectCuts(states, needed, STRATEGY_WEIGHTS[mode], constraints.cutFirst);

  const cuts = states
    .filter(({ cut }) => cut > EPSILON)
    .map<PlanCut>(({ baseline: { appliance, costPerDailyHour }, floor: stateFloor, cut }) => {
      const room = appliance.hoursPerDay - stateFloor;
      // Land exactly on the floor once the whole room is used, so float drift never leaves a sliver.
      const toHoursPerDay = room - cut < EPSILON ? stateFloor : appliance.hoursPerDay - cut;
      return {
        applianceId: appliance.id,
        fromHoursPerDay: appliance.hoursPerDay,
        toHoursPerDay,
        saving: costPerDailyHour * (appliance.hoursPerDay - toHoursPerDay),
      };
    })
    .sort((a, b) => b.saving - a.saving);

  const totalCuts = cuts.reduce((sum, { saving }) => sum + saving, 0);
  const kwhSaved = states.reduce((sum, { baseline: { appliance, kwh }, cut }) => {
    return cut > EPSILON && appliance.hoursPerDay > 0 ? sum + kwh * (cut / appliance.hoursPerDay) : sum;
  }, 0);
  const feasible = floor <= target + EPSILON;

  return {
    mode,
    status: feasible ? 'feasible' : 'not-reachable',
    target,
    currentEstimate,
    projectedBill: feasible ? currentEstimate - totalCuts : floor,
    floor,
    totalCuts,
    kwhSaved,
    co2SavedKg: kwhSaved * CO2_KG_PER_KWH,
    cuts,
  };
}

/** Cuts hours, one step at a time, until `needed` pesos are saved or nothing is left to cut. Mutates `states`. */
function selectCuts(states: CutState[], needed: number, weights: Weights, cutFirst: string[]): void {
  const isFirst = ({ baseline: { appliance } }: CutState) => cutFirst.includes(appliance.id);
  const tiers = [
    states.filter(isFirst),
    ...CATEGORY_ORDER.map((category) => states.filter((state) => !isFirst(state) && state.baseline.appliance.category === category)),
  ];

  let remaining = needed;
  for (const tier of tiers) {
    while (remaining > EPSILON) {
      const next = bestStep(tier, weights);
      if (!next) break;
      next.state.cut += next.hours;
      remaining -= next.saving;
    }
    if (remaining <= EPSILON) return;
  }
}

/** The step with the best pesos saved per sacrifice among `tier`, or null when none has room left. Ties go to the earlier appliance. */
function bestStep(tier: CutState[], { changePenalty, convexity }: Weights) {
  let best: { state: CutState; hours: number; saving: number; ratio: number } | null = null;

  for (const state of tier) {
    const { appliance, costPerDailyHour } = state.baseline;
    const room = appliance.hoursPerDay - state.floor - state.cut;
    if (room <= EPSILON || costPerDailyHour <= 0) continue;

    const hours = Math.min(HOUR_STEP, room);
    const saving = costPerDailyHour * hours;
    const shareCut = (state.cut + hours / 2) / appliance.hoursPerDay;
    const sacrifice =
      CATEGORY_WEIGHT[appliance.category] * hours * (1 + convexity * shareCut) + (state.cut === 0 ? changePenalty : 0);
    const ratio = saving / sacrifice;

    if (!best || ratio > best.ratio + EPSILON) best = { state, hours, saving, ratio };
  }
  return best;
}

/** The appliance that costs the most per month, or null when there are none. */
export function costliestItem(baseline: Baseline): ApplianceBaseline | null {
  return baseline.items.reduce<ApplianceBaseline | null>((best, item) => (!best || item.cost > best.cost ? item : best), null);
}
