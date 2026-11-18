/**
 * Shared domain types. Plain data only: the optimizer (src/optimizer) turns these
 * into kWh and peso figures, and the AI layer (src/ai) never produces numbers.
 */

export type ApplianceCategory = 'essential' | 'flexible' | 'luxury';

export type Appliance = {
  id: string;
  name: string;
  category: ApplianceCategory;
  /** Rated power draw in watts. */
  watts: number;
  hoursPerDay: number;
  daysPerWeek: number;
  /**
   * Lowest hours per day the household can live with. The optimizer never cuts
   * below this. Only set for essential and flexible appliances; luxury has none.
   */
  minHoursPerDay?: number;
  /** Free-text secondary line, e.g. "Living room" or "Tue / Thu / Sat". */
  note?: string;
};

/** How the household's bill is priced: the Meralco formula, or one effective ₱ per kWh for other utilities. */
export type RateMode = 'meralco' | 'custom';

export type BillSettings = {
  /** Utility and rate class, e.g. "Meralco Residential". */
  utility: string;
  rateMode: RateMode;
  /** Effective ₱ per kWh for the custom mode. Null: use last bill total / last bill kWh when both are known. */
  customRatePerKwh: number | null;
  /** Applies the formula's senior citizen discount when monthly consumption is within the eligibility limit. */
  isRegisteredSenior: boolean;
  /** Billing period as ISO dates (YYYY-MM-DD). */
  periodStart: string;
  periodEnd: string;
  /** Last bill total in pesos. Optional: only used to compare with the formula (or to derive a custom rate). */
  lastBillTotal: number | null;
  /** Last bill usage in kWh. Required for calibration; null until the user enters it. */
  lastBillKwh: number | null;
  /** Optional split of the last bill, in pesos. Null for any line the user left blank. */
  generationCharge: number | null;
  distributionCharge: number | null;
  taxesCharge: number | null;
};

export type PlanMode = 'fewest-changes' | 'comfort-first';

export type PlanStatus = 'feasible' | 'not-reachable';

/** What the user asked for in chat, as data the optimizer understands. Ids are appliance ids. */
export type PlanConstraints = {
  /** Appliances the planner must leave untouched. */
  keep: string[];
  /** Appliances the planner cuts before any others. */
  cutFirst: string[];
};

export const NO_CONSTRAINTS: PlanConstraints = { keep: [], cutFirst: [] };

export type PlanCut = {
  applianceId: string;
  fromHoursPerDay: number;
  toHoursPerDay: number;
  /** Pesos saved per month, as a positive number. */
  saving: number;
};

/** Output of the optimizer. Every number here is computed in src/optimizer. */
export type Plan = {
  mode: PlanMode;
  status: PlanStatus;
  /** Monthly target the plan was computed for, in pesos. */
  target: number;
  currentEstimate: number;
  /** kWh per month before any cuts: the consumption `currentEstimate` is priced on. */
  currentKwh: number;
  /** `currentEstimate` without the senior discount: the raw bill for `currentKwh`. Pesos per month. */
  undiscountedEstimate: number;
  /** Bill after the cuts. When the target is not reachable this is the floor. */
  projectedBill: number;
  /** Negative Meralco senior discount inside `projectedBill`, or null when it does not apply (not a senior, or over 100 kWh). */
  seniorDiscount: number | null;
  /** Lowest realistic bill: every appliance at its minimum hours (luxury at zero). Pesos per month. */
  floor: number;
  totalCuts: number;
  /** kWh per month the cuts save. */
  kwhSaved: number;
  /** kg of CO₂ per month the cuts avoid. */
  co2SavedKg: number;
  cuts: PlanCut[];
};
