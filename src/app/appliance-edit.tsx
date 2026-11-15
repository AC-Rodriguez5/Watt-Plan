import { useLocalSearchParams } from 'expo-router';

import { ApplianceSheet } from '@/components/appliance-sheet';
import { useAppStore } from '@/store/app-store';

/** Receives the appliance `id` as a route param. */
export default function ApplianceEditSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const appliance = useAppStore((state) => state.appliances.find((a) => a.id === id));

  // Also renders null for the instant after Delete removes the appliance, while the sheet closes.
  if (!appliance) return null;

  return <ApplianceSheet mode="edit" appliance={appliance} />;
}
