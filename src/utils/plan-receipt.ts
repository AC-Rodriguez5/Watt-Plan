import type { ReceiptLineItem, ReceiptProps } from '@/components/receipt';
import type { Appliance, BillSettings, Plan } from '@/types/energy';

import { formatMonthYear } from './billing-period';

/** Printed on the receipt for decoration only. */
const TERM_ID = 'PH-MNL-7749-X';
const BARCODE_NUMBER = '0924 8831 2000';

/** 4.5 -> "4.5 h" */
function hours(value: number): string {
  return `${value.toFixed(1)} h`;
}

/** 1.5 -> "(-1.5 h)", 0.25 -> "(-15 min)" */
function hoursCut(value: number): string {
  return value < 1 ? `(-${Math.round(value * 60)} min)` : `(-${hours(value)})`;
}

/** Turns the plan in the store into what the Receipt prints. Cuts whose appliance was deleted are skipped. */
export function toReceiptProps(plan: Plan, appliances: Appliance[], bill: BillSettings): ReceiptProps {
  const items = plan.cuts.flatMap<ReceiptLineItem>((cut) => {
    const appliance = appliances.find(({ id }) => id === cut.applianceId);
    if (!appliance) return [];
    return {
      id: appliance.id,
      category: appliance.category,
      name: appliance.name,
      saving: cut.saving,
      detail: `${hours(cut.fromHoursPerDay)} → ${hours(cut.toHoursPerDay)} daily`,
      change: hoursCut(cut.fromHoursPerDay - cut.toHoursPerDay),
    };
  });

  return {
    items,
    status: plan.status,
    projectedBill: plan.projectedBill,
    currentEstimate: plan.currentEstimate,
    target: plan.target,
    totalCuts: plan.totalCuts,
    period: formatMonthYear(bill.periodEnd),
    termId: TERM_ID,
    barcodeNumber: BARCODE_NUMBER,
  };
}
