import type { AndroidSymbol } from 'expo-symbols';

const APPLIANCE_ICONS: Record<string, AndroidSymbol> = {
  aircon: 'ac_unit',
  refrigerator: 'kitchen',
  tv: 'tv',
  'stand-fan': 'mode_fan',
  'rice-cooker': 'soup_kitchen',
  washer: 'local_laundry_service',
};

/** Material Symbol for an appliance, falling back to a bolt for ones added by the user. */
export function applianceIcon(id: string): AndroidSymbol {
  return APPLIANCE_ICONS[id] ?? 'bolt';
}
