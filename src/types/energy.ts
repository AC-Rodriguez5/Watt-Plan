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

export type BillSettings = {
  /** Utility and rate class, e.g. "Meralco Residential". */
  utility: string;
  /** Billing period as ISO dates (YYYY-MM-DD). */
  periodStart: string;
  periodEnd: string;
  /** Last bill total in pesos. Null until the user enters it. */
  lastBillTotal: number | null;
  /** Last bill usage in kWh. Null until the user enters it. */
  lastBillKwh: number | null;
  /** Optional split of the last bill, in pesos. Null for any line the user left blank. */
  generationCharge: number | null;
  distributionCharge: number | null;
  taxesCharge: number | null;
};

export type PlanMode = 'fewest-changes' | 'comfort-first';

export type PlanStatus = 'feasible' | 'not-reachable';

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
  projectedBill: number;
  totalCuts: number;
  cuts: PlanCut[];
};
