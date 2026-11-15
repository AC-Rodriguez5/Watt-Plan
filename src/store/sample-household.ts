import type { Appliance, BillSettings } from '@/types/energy';

/** Sample household from design/screens (appliances, bill settings, home). */

export const SAMPLE_APPLIANCES: Appliance[] = [
  { id: 'aircon', name: 'Inverter Aircon', category: 'luxury', watts: 900, hoursPerDay: 8, daysPerWeek: 7 },
  {
    id: 'refrigerator',
    name: 'Two-Door Refrigerator',
    category: 'essential',
    watts: 130,
    hoursPerDay: 24,
    daysPerWeek: 7,
    note: 'Continuous duty',
  },
  { id: 'tv', name: '50" Smart TV', category: 'flexible', watts: 100, hoursPerDay: 5, daysPerWeek: 7, note: 'Living room' },
  { id: 'stand-fan', name: 'Stand Fan', category: 'essential', watts: 60, hoursPerDay: 14, daysPerWeek: 7, note: 'Living Area' },
  {
    id: 'rice-cooker',
    name: 'Jar Rice Cooker',
    category: 'essential',
    watts: 700,
    hoursPerDay: 1,
    daysPerWeek: 7,
    note: 'Warm mode included',
  },
  {
    id: 'washer',
    name: 'Top Load Washer',
    category: 'flexible',
    watts: 450,
    hoursPerDay: 2,
    daysPerWeek: 3,
    note: 'Tue / Thu / Sat',
  },
];

export const SAMPLE_BILL_SETTINGS: BillSettings = {
  utility: 'Meralco Residential',
  periodStart: '2024-10-01',
  periodEnd: '2024-10-31',
  lastBillTotal: 3400,
  lastBillKwh: 283,
};

/** Monthly bill target in pesos. */
export const SAMPLE_TARGET = 2000;
