import type { Appliance } from '@/types/energy';

import { costliestItem, type Baseline } from './optimizer';

/** One card on the Appliances tab. */
export type ApplianceListItem = {
  appliance: Appliance;
  /** Pesos per month, from the calibrated baseline. */
  cost: number;
  /**
   * This appliance's share of the household's monthly cost, 0 to 1. Only set on the costliest
   * appliance, which the card flags as "45.7% of bill". Null on the others, and when there is
   * nothing to compare against (a single appliance, or no cost at all).
   */
  shareOfBill: number | null;
};

/**
 * Every appliance with its monthly cost, costliest first. Appliances that cost the same keep the
 * order they were added in. The costliest one also carries its share of the bill.
 */
export function applianceListItems(baseline: Baseline): ApplianceListItem[] {
  const costliest = baseline.items.length > 1 && baseline.cost > 0 ? costliestItem(baseline) : null;
  return baseline.items
    .map(({ appliance, cost }) => ({
      appliance,
      cost,
      shareOfBill: costliest !== null && appliance.id === costliest.appliance.id ? cost / baseline.cost : null,
    }))
    .sort((a, b) => b.cost - a.cost);
}
