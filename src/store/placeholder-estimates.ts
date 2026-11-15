/**
 * TEMPORARY display figures copied from design/screens/appliances.png so the
 * Appliances tab can render before src/optimizer exists. They are NOT computed
 * and do not follow edits to an appliance. All money and kWh math belongs in
 * src/optimizer: replace these lookups with its output and delete this file.
 */

export type ApplianceDetailTone = 'neutral' | 'positive' | 'warning';

export type PlaceholderEstimate = {
  /** Pesos per month. */
  monthlyCost: number;
  /** Replaces the appliance's note on the card's second row, e.g. "45.7% of bill". */
  detail?: { text: string; tone: ApplianceDetailTone };
};

export const PLACEHOLDER_ESTIMATES: Record<string, PlaceholderEstimate> = {
  aircon: { monthlyCost: 1350, detail: { text: '45.7% of bill', tone: 'warning' } },
  refrigerator: { monthlyCost: 620 },
  tv: { monthlyCost: 310 },
  'stand-fan': { monthlyCost: 295 },
  'rice-cooker': { monthlyCost: 250, detail: { text: 'Warm mode included', tone: 'positive' } },
  washer: { monthlyCost: 130 },
};

/** Total for the "Estimated monthly load" ribbon. */
export const PLACEHOLDER_MONTHLY_LOAD = { cost: 2955, kwh: 246 } as const;
