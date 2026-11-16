import type { ApplianceCategory } from '@/types/energy';
import type { ApplianceFormValues } from '@/utils/appliance-form';

/** Starting values for a quick-add chip. Everything stays editable in the add sheet. */
export type AppliancePreset = {
  name: string;
  watts: number;
  hoursPerDay: number;
  daysPerWeek: number;
  category: ApplianceCategory;
  /** Lowest hours per day the household can live with. Luxury appliances have none. */
  minHoursPerDay?: number;
};

export const APPLIANCE_PRESETS = {
  refrigerator: { name: 'Refrigerator', watts: 130, hoursPerDay: 24, daysPerWeek: 7, category: 'essential', minHoursPerDay: 24 },
  'stand-fan': { name: 'Stand Fan', watts: 60, hoursPerDay: 8, daysPerWeek: 7, category: 'flexible', minHoursPerDay: 4 },
  aircon: { name: 'Aircon', watts: 900, hoursPerDay: 8, daysPerWeek: 7, category: 'luxury' },
  tv: { name: 'Smart TV', watts: 100, hoursPerDay: 5, daysPerWeek: 7, category: 'flexible', minHoursPerDay: 2 },
  'rice-cooker': { name: 'Rice Cooker', watts: 700, hoursPerDay: 1, daysPerWeek: 7, category: 'essential', minHoursPerDay: 1 },
  washer: { name: 'Washing Machine', watts: 450, hoursPerDay: 2, daysPerWeek: 3, category: 'flexible', minHoursPerDay: 1 },
} as const satisfies Record<string, AppliancePreset>;

export type AppliancePresetKey = keyof typeof APPLIANCE_PRESETS;

/** The preset for a route param or chip key, or undefined when it is missing or unknown. */
export function findPreset(key: string | undefined): AppliancePreset | undefined {
  if (key === undefined || !Object.hasOwn(APPLIANCE_PRESETS, key)) return undefined;
  return APPLIANCE_PRESETS[key as AppliancePresetKey];
}

/** The add sheet's blank form. */
export function emptyApplianceForm(): ApplianceFormValues {
  return { name: '', watts: '', hoursPerDay: '', daysPerWeek: '7', minHoursPerDay: '', category: 'essential' };
}

/** Form text for the add sheet: the preset's values, or a blank form when there is no preset. */
export function addFormValues(preset?: AppliancePreset): ApplianceFormValues {
  if (!preset) return emptyApplianceForm();
  return {
    name: preset.name,
    watts: String(preset.watts),
    hoursPerDay: String(preset.hoursPerDay),
    daysPerWeek: String(preset.daysPerWeek),
    minHoursPerDay: preset.minHoursPerDay === undefined ? '' : String(preset.minHoursPerDay),
    category: preset.category,
  };
}
