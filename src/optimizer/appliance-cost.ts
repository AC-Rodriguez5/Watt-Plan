import type { Appliance } from '@/types/energy';

/** Average weeks in a month, used to turn weekly usage into a monthly figure. */
export const WEEKS_PER_MONTH = 4.33;

/** kg of CO₂ per kWh on the Philippine grid. Rounded; used for the Home carbon card and plan savings. */
export const CO2_KG_PER_KWH = 0.55;

export type ApplianceUsage = Pick<Appliance, 'watts' | 'hoursPerDay' | 'daysPerWeek'>;

/** kWh one appliance uses in a month. */
export function monthlyKwh({ watts, hoursPerDay, daysPerWeek }: ApplianceUsage): number {
  return (watts * hoursPerDay * daysPerWeek * WEEKS_PER_MONTH) / 1000;
}

/** Pesos for a given kWh at a given rate. */
export function costForKwh(kwh: number, ratePerKwh: number): number {
  return kwh * ratePerKwh;
}

/** Pesos one appliance costs in a month. */
export function monthlyCost(usage: ApplianceUsage, ratePerKwh: number): number {
  return costForKwh(monthlyKwh(usage), ratePerKwh);
}
