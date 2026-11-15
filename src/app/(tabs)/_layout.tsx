import { NativeTabs } from 'expo-router/native-tabs';

import { colors, fontFamilies } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <NativeTabs
      backgroundColor={colors.surfaceContainerLowest}
      indicatorColor={colors.secondaryContainer}
      iconColor={{ default: colors.onSurfaceVariant, selected: colors.onSecondaryContainer }}
      labelStyle={{
        default: { color: colors.onSurfaceVariant, fontFamily: fontFamilies.inter.medium, fontSize: 12 },
        selected: { color: colors.onSurface, fontFamily: fontFamilies.inter.semiBold, fontSize: 12 },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="appliances">
        <NativeTabs.Trigger.Label>Appliances</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="devices" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="plan">
        <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="receipt_long" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
