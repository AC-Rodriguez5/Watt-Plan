import {
  NO_CONSTRAINTS,
  type Appliance,
  type ApplianceCategory,
  type Plan,
  type PlanConstraints,
  type PlanCut,
  type PlanMode,
} from '@/types/energy';

import { CO2_KG_PER_KWH, monthlyKwh, type ApplianceUsage } from './appliance-cost';
import { billForKwh, isPositive, pricingFor, ratePerKwhAt, seniorDiscountForKwh, type BillInputs, type Pricing } from './pricing';

/** Cuts move in steps of this many hours a day, so the receipt shows tidy figures. */
export const HOUR_STEP = 0.5;

/** Rounding slack for peso and hour comparisons. */
const EPSILON = 1e-6;

/**
 * Plain TypeScript, no AI, no network. Every peso and kWh figure in the app comes from here.
 *
 * The model: each appliance's kWh is scaled by one calibration factor (billed kWh / summed appliance
 * kWh at the time the bill settings were saved), so the baseline kWh equals the last bill's kWh until
 * the appliances change. The household's bill is `billForKwh` of that total (the Meralco formula, or a
 * custom ₱ per kWh) and each appliance is charged its share of it by kWh. Cutting hours lowers the
 * total kWh, and the saving is the bill before minus the bill after, split by each appliance's share
 * of the kWh cut.
 */

export type ApplianceBaseline = {
  appliance: Appliance;
  /** kWh per month, scaled by the calibration factor. */
  kwh: number;
  /** kWh per month for each hour a day the appliance runs, scaled. */
  kwhPerDailyHour: number;
  /** Pesos per month: the household bill split by kWh share. The items' costs add up to `Baseline.cost`. */
  cost: number;
  /** Pesos the household bill drops by for each hour a day cut from this appliance, all else unchanged. */
  costPerDailyHour: number;
};

export type Baseline = {
  /** How kWh become pesos for this household. */
  pricing: Pricing;
  /** Pesos per kWh: the baseline bill / baseline kWh (quoted at a reference consumption when there is none). */
  ratePerKwh: number;
  /** The stored factor (billed kWh / summed appliance kWh when the bill was saved). 1 without a last bill kWh. */
  calibrationFactor: number;
  isCalibrated: boolean;
  /** kWh per month across all appliances, scaled. */
  kwh: number;
  /** Pesos per month for `kwh`. 0 when there is no kWh to bill. */
  cost: number;
  /** Negative Meralco senior discount applied to this estimate, or null when ineligible. */
  seniorDiscount: number | null;
  items: ApplianceBaseline[];
};

/**
 * Monthly kWh and cost per appliance, each scaled by `storedFactor`: the factor computed when the
 * bill settings were last saved (see computeCalibrationFactor). It is not recomputed here, so adding
 * or editing an appliance changes the estimate instead of being scaled back to the last bill.
 * With no last bill kWh to calibrate against the factor is 1, whatever is passed.
 */
export function buildBaseline(appliances: Appliance[], bill: BillInputs, storedFactor: number): Baseline {
  const pricing = pricingFor(bill);
  const isCalibrated = isPositive(bill.lastBillKwh);
  const calibrationFactor = isCalibrated ? storedFactor : 1;

  const kwhs = appliances.map((appliance) => monthlyKwh(appliance) * calibrationFactor);
  const kwh = kwhs.reduce((sum, value) => sum + value, 0);
  // No kWh, no estimate: the fixed charges have no appliance to be split onto.
  const cost = kwh > 0 ? billForKwh(kwh, pricing) : 0;

  const items = appliances.map<ApplianceBaseline>((appliance, index) => {
    const kwhPerDailyHour = monthlyKwh({ ...appliance, hoursPerDay: 1 }) * calibrationFactor;
    return {
      appliance,
      kwh: kwhs[index],
      kwhPerDailyHour,
      cost: kwh > 0 ? (cost * kwhs[index]) / kwh : 0,
      costPerDailyHour: Math.max(0, cost - billForKwh(kwh - kwhPerDailyHour, pricing)),
    };
  });

  return {
    pricing,
    ratePerKwh: ratePerKwhAt(kwh, pricing),
    calibrationFactor,
    isCalibrated,
    kwh,
    cost,
    seniorDiscount: seniorDiscountForKwh(kwh, pricing),
    items,
  };
}

/**
 * One appliance's monthly kWh and cost, scaled and priced exactly like `buildBaseline` does it, so the
 * add/edit sheet shows the figure the appliance list will show once it is saved. `others` are the
 * household's other appliances: the cost is this appliance's kWh share of the whole household's bill.
 * `ratePerKwh` is that bill / kWh.
 */
export function estimateAppliance(
  usage: ApplianceUsage,
  bill: BillInputs,
  storedFactor: number,
  others: Appliance[] = [],
): { kwh: number; cost: number; ratePerKwh: number } {
  const pricing = pricingFor(bill);
  const factor = isPositive(bill.lastBillKwh) ? storedFactor : 1;
  const kwh = monthlyKwh(usage) * factor;
  const total = kwh + others.reduce((sum, other) => sum + monthlyKwh(other) * factor, 0);
  const householdBill = billForKwh(total, pricing);
  return { kwh, cost: total > 0 ? (householdBill * kwh) / total : 0, ratePerKwh: ratePerKwhAt(total, pricing) };
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
  const floorKwh = baseline.items.reduce((sum, { appliance, kwhPerDailyHour }) => sum + kwhPerDailyHour * floorHours(appliance, constraints.keep), 0);
  return billForKwh(floorKwh, baseline.pricing);
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
 * when it has one). Inside a category the cut with the best kWh saved per sacrifice goes first.
 * Appliances in `constraints.cutFirst` go before every category; `constraints.keep` are never cut.
 *
 * The bill is not linear in kWh (fixed charges, tiers), so cuts are made one step at a time and the
 * bill is recomputed after each, until it is at or under `target`. `totalCuts` is the bill before
 * minus the bill after, and each cut's `saving` is that total split by its share of the kWh cut, so
 * the cuts' savings add up to `totalCuts` exactly.
 *
 * When the target is below the floor the plan cuts everything to its floor, reports
 * `not-reachable`, and `projectedBill` is that floor: the lowest realistic bill.
 *
 * Returns null when there is nothing to plan: no target, or no appliances.
 */
export function optimize(
  appliances: Appliance[],
  bill: BillInputs,
  calibrationFactor: number,
  target: number | null,
  mode: PlanMode,
  constraints: PlanConstraints = NO_CONSTRAINTS,
): Plan | null {
  if (target === null || !(target > 0) || appliances.length === 0) return null;

  const baseline = buildBaseline(appliances, bill, calibrationFactor);
  const currentEstimate = baseline.cost;
  const floor = lowestBill(baseline, constraints);

  const states = baseline.items.map<CutState>((item) => ({
    baseline: item,
    floor: floorHours(item.appliance, constraints.keep),
    cut: 0,
  }));

  if (currentEstimate - target > EPSILON) selectCuts(states, baseline, target, STRATEGY_WEIGHTS[mode], constraints.cutFirst);

  const changed = states
    .filter(({ cut }) => cut > EPSILON)
    .map(({ baseline: { appliance, kwhPerDailyHour }, floor: stateFloor, cut }) => {
      const room = appliance.hoursPerDay - stateFloor;
      // Land exactly on the floor once the whole room is used, so float drift never leaves a sliver.
      const toHoursPerDay = room - cut < EPSILON ? stateFloor : appliance.hoursPerDay - cut;
      return { appliance, toHoursPerDay, kwhCut: kwhPerDailyHour * (appliance.hoursPerDay - toHoursPerDay) };
    });

  const kwhSaved = changed.reduce((sum, { kwhCut }) => sum + kwhCut, 0);
  const feasible = floor <= target + EPSILON;
  const projectedBill = feasible ? billForKwh(baseline.kwh - kwhSaved, baseline.pricing) : floor;
  const totalCuts = currentEstimate - projectedBill;

  const cuts = changed
    .map<PlanCut>(({ appliance, toHoursPerDay, kwhCut }) => ({
      applianceId: appliance.id,
      fromHoursPerDay: appliance.hoursPerDay,
      toHoursPerDay,
      saving: kwhSaved > 0 ? (totalCuts * kwhCut) / kwhSaved : 0,
    }))
    .sort((a, b) => b.saving - a.saving);

  return {
    mode,
    status: feasible ? 'feasible' : 'not-reachable',
    target,
    currentEstimate,
    projectedBill,
    floor,
    totalCuts,
    kwhSaved,
    co2SavedKg: kwhSaved * CO2_KG_PER_KWH,
    cuts,
  };
}

/** Cuts hours, one step at a time, until the bill is at or under `target` or nothing is left to cut. Mutates `states`. */
function selectCuts(states: CutState[], baseline: Baseline, target: number, weights: Weights, cutFirst: string[]): void {
  const isFirst = ({ baseline: { appliance } }: CutState) => cutFirst.includes(appliance.id);
  const tiers = [
    states.filter(isFirst),
    ...CATEGORY_ORDER.map((category) => states.filter((state) => !isFirst(state) && state.baseline.appliance.category === category)),
  ];

  let kwh = baseline.kwh;
  const overTarget = () => billForKwh(kwh, baseline.pricing) > target + EPSILON;
  for (const tier of tiers) {
    while (overTarget()) {
      const next = bestStep(tier, weights, baseline.ratePerKwh);
      if (!next) break;
      next.state.cut += next.hours;
      kwh -= next.kwh;
    }
    if (!overTarget()) return;
  }
}

/**
 * The step with the best saving per sacrifice among `tier`, or null when none has room left. Ties go
 * to the earlier appliance. Steps are ranked by kWh (every kWh cut is worth the same at the margin),
 * valued at the household's average ₱ per kWh so the ratios stay in pesos.
 */
function bestStep(tier: CutState[], { changePenalty, convexity }: Weights, ratePerKwh: number) {
  let best: { state: CutState; hours: number; kwh: number; ratio: number } | null = null;

  for (const state of tier) {
    const { appliance, kwhPerDailyHour } = state.baseline;
    const room = appliance.hoursPerDay - state.floor - state.cut;
    if (room <= EPSILON || kwhPerDailyHour <= 0) continue;

    const hours = Math.min(HOUR_STEP, room);
    const kwh = kwhPerDailyHour * hours;
    const shareCut = (state.cut + hours / 2) / appliance.hoursPerDay;
    const sacrifice =
      CATEGORY_WEIGHT[appliance.category] * hours * (1 + convexity * shareCut) + (state.cut === 0 ? changePenalty : 0);
    const ratio = (kwh * ratePerKwh) / sacrifice;

    if (!best || ratio > best.ratio + EPSILON) best = { state, hours, kwh, ratio };
  }
  return best;
}

/** The appliance that costs the most per month, or null when there are none. */
export function costliestItem(baseline: Baseline): ApplianceBaseline | null {
  return baseline.items.reduce<ApplianceBaseline | null>((best, item) => (!best || item.cost > best.cost ? item : best), null);
}
