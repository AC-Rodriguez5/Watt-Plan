import { NO_CONSTRAINTS, type Appliance, type BillSettings, type Plan, type PlanConstraints, type PlanCut, type PlanMode } from '@/types/energy';

import { CO2_KG_PER_KWH, monthlyCost, monthlyKwh } from './appliance-cost';
import { calibrate } from './bill-calibration';

/** Cuts are rounded up to this many hours so the receipt shows tidy figures. */
const HOUR_STEP = 0.5;

type Candidate = {
  appliance: Appliance;
  /** Lowest hours per day the planner may cut this appliance to. */
  floor: number;
  /** Pesos per month saved by cutting all the way to the floor. */
  maxSaving: number;
};

/**
 * FALLBACK ONLY: a simple greedy planner. The app uses `optimize` (optimizer.ts) and only falls
 * back to this one, via computePlan, when the optimizer throws. Same signature and `Plan` result.
 *
 * - Luxury appliances can be cut to zero. Essential and flexible ones only down to the
 *   minimum hours the household set, and not at all when none is set.
 * - `fewest-changes` empties the biggest savers first, so it touches as few appliances as it can.
 * - `comfort-first` takes the same share of every cuttable appliance's room to cut.
 *
 * - `constraints.keep` appliances are never cut. `constraints.cutFirst` appliances are cut as far
 *   as they go before the mode's strategy touches anything else.
 *
 * Returns null when there is nothing to plan: no target, or no appliances.
 */
export function planStub(
  appliances: Appliance[],
  bill: BillSettings,
  target: number | null,
  mode: PlanMode,
  constraints: PlanConstraints = NO_CONSTRAINTS,
): Plan | null {
  if (target === null || target <= 0 || appliances.length === 0) return null;

  const { ratePerKwh, matchedBill: currentEstimate } = calibrate(appliances, bill.lastBillTotal, bill.lastBillKwh);
  const needed = Math.max(0, currentEstimate - target);

  const candidates = appliances
    .map<Candidate>((appliance) => {
      const floor = constraints.keep.includes(appliance.id) ? appliance.hoursPerDay : cutFloor(appliance);
      return {
        appliance,
        floor,
        maxSaving: monthlyCost(appliance, ratePerKwh) - monthlyCost({ ...appliance, hoursPerDay: floor }, ratePerKwh),
      };
    })
    .filter(({ maxSaving }) => maxSaving > 0);

  const cuts = needed === 0 ? [] : planCuts(candidates, needed, ratePerKwh, mode, constraints.cutFirst);

  const totalCuts = cuts.reduce((sum, cut) => sum + cut.saving, 0);
  const kwhSaved = cuts.reduce((sum, cut) => {
    const appliance = appliances.find(({ id }) => id === cut.applianceId);
    if (!appliance) return sum;
    return sum + monthlyKwh(appliance) - monthlyKwh({ ...appliance, hoursPerDay: cut.toHoursPerDay });
  }, 0);
  const projectedBill = currentEstimate - totalCuts;
  const floor = currentEstimate - candidates.reduce((sum, { maxSaving }) => sum + maxSaving, 0);

  return {
    mode,
    status: projectedBill <= target ? 'feasible' : 'not-reachable',
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

function planCuts(
  candidates: Candidate[],
  needed: number,
  ratePerKwh: number,
  mode: PlanMode,
  cutFirst: string[],
): PlanCut[] {
  const first = candidates.filter(({ appliance }) => cutFirst.includes(appliance.id));
  const rest = candidates.filter(({ appliance }) => !cutFirst.includes(appliance.id));

  // Empty the asked-for appliances first, then let the mode share out what is still needed.
  const cuts = first.map((candidate) => buildCut(candidate, 1, ratePerKwh));
  const stillNeeded = needed - cuts.reduce((sum, cut) => sum + cut.saving, 0);
  if (stillNeeded <= 0) return cuts;

  const more = mode === 'fewest-changes' ? cutBiggestFirst(rest, stillNeeded, ratePerKwh) : cutEvenly(rest, stillNeeded, ratePerKwh);
  return [...cuts, ...more];
}

function cutFloor({ category, hoursPerDay, minHoursPerDay }: Appliance): number {
  if (category === 'luxury') return 0;
  return Math.min(hoursPerDay, minHoursPerDay ?? hoursPerDay);
}

function cutBiggestFirst(candidates: Candidate[], needed: number, ratePerKwh: number): PlanCut[] {
  const cuts: PlanCut[] = [];
  let remaining = needed;
  for (const candidate of [...candidates].sort((a, b) => b.maxSaving - a.maxSaving)) {
    if (remaining <= 0) break;
    const cut = buildCut(candidate, Math.min(1, remaining / candidate.maxSaving), ratePerKwh);
    cuts.push(cut);
    remaining -= cut.saving;
  }
  return cuts;
}

function cutEvenly(candidates: Candidate[], needed: number, ratePerKwh: number): PlanCut[] {
  const available = candidates.reduce((sum, { maxSaving }) => sum + maxSaving, 0);
  if (available <= 0) return [];
  const share = Math.min(1, needed / available);
  return candidates.map((candidate) => buildCut(candidate, share, ratePerKwh));
}

/** Cuts `share` (0 to 1) of an appliance's room to cut, rounded up to HOUR_STEP and kept above its floor. */
function buildCut({ appliance, floor }: Candidate, share: number, ratePerKwh: number): PlanCut {
  const room = appliance.hoursPerDay - floor;
  const hours = Math.min(room, Math.ceil((room * share) / HOUR_STEP) * HOUR_STEP);
  const toHoursPerDay = appliance.hoursPerDay - hours;
  return {
    applianceId: appliance.id,
    fromHoursPerDay: appliance.hoursPerDay,
    toHoursPerDay,
    saving: monthlyCost(appliance, ratePerKwh) - monthlyCost({ ...appliance, hoursPerDay: toHoursPerDay }, ratePerKwh),
  };
}
