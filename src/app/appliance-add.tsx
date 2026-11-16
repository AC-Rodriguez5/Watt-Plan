import { useLocalSearchParams } from 'expo-router';

import { ApplianceSheet } from '@/components/appliance-sheet';
import { findPreset } from '@/utils/appliance-presets';

/** Opens empty, or pre-filled when a quick-add chip passes a `preset` route param. */
export default function ApplianceAddSheet() {
  const { preset } = useLocalSearchParams<{ preset?: string }>();

  // Keyed by the preset so a different chip always mounts a fresh sheet with fresh fields.
  return <ApplianceSheet key={preset ?? 'blank'} mode="add" preset={findPreset(preset)} />;
}
