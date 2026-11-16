import type { AndroidSymbol } from 'expo-symbols';

/**
 * Words in an appliance's name and the Material Symbol they map to. Checked in order, so the aircon
 * rule wins over the fan rule for a name like "Aircon with fan mode".
 */
const NAME_ICONS: [RegExp, AndroidSymbol][] = [
  [/air ?con|\ba\/?c\b/, 'ac_unit'],
  [/fridge|refrigerator|freezer|\bref\b/, 'kitchen'],
  [/\btv\b|television/, 'tv'],
  [/\bfans?\b/, 'mode_fan'],
  [/rice ?cooker|cooker/, 'soup_kitchen'],
  [/wash|laundry|dryer/, 'local_laundry_service'],
  [/microwave/, 'microwave'],
  [/\biron\b/, 'iron'],
  [/computer|laptop|desktop|\bpc\b/, 'computer'],
  [/light|bulb|lamp/, 'lightbulb'],
];

/** Material Symbol for an appliance, picked from its name. A bolt when nothing in the name matches. */
export function applianceIcon(name: string): AndroidSymbol {
  const lower = name.toLowerCase();
  return NAME_ICONS.find(([pattern]) => pattern.test(lower))?.[1] ?? 'bolt';
}
