import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { ApplianceCard } from '@/components/appliance-card';
import { AppliancesEmptyState } from '@/components/appliances-empty-state';
import { Icon } from '@/components/icon';
import { colors, maxContentWidth, radii, shadows, spacing, typography, fontFamilies } from '@/constants/theme';
import { effectiveRatePerKwh } from '@/optimizer/appliance-cost';
import { PLACEHOLDER_ESTIMATES } from '@/store/placeholder-estimates';
import { useAppStore } from '@/store/app-store';
import type { AppliancePresetKey } from '@/utils/appliance-presets';
import { formatPeso, formatWhole } from '@/utils/format';

const QUICK_ADD: { label: string; preset: AppliancePresetKey }[] = [
  { label: 'Refrigerator', preset: 'refrigerator' },
  { label: 'Stand fan', preset: 'stand-fan' },
  { label: 'Aircon', preset: 'aircon' },
  { label: 'Smart TV', preset: 'tv' },
  { label: 'Rice cooker', preset: 'rice-cooker' },
  { label: 'Washing machine', preset: 'washer' },
];

export default function AppliancesScreen() {
  const appliances = useAppStore((state) => state.appliances);
  const billSettings = useAppStore((state) => state.billSettings);
  const baseline = useAppStore((state) => state.baseline);
  const isEmpty = appliances.length === 0;

  /** Opens the add sheet empty, or pre-filled from a quick-add preset. */
  const openAddSheet = (preset?: AppliancePresetKey) =>
    router.push(preset ? { pathname: '/appliance-add', params: { preset } } : '/appliance-add');
  const openEditSheet = (id: string) => router.push({ pathname: '/appliance-edit', params: { id } });

  return (
    <View style={styles.screen}>
      <AppHeader />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={styles.titleGroup}>
              <Text style={styles.title}>My appliances</Text>
              <View style={[styles.countBadge, isEmpty && styles.countBadgeEmpty]}>
                <Text style={[styles.countText, isEmpty && styles.countTextEmpty]}>{appliances.length} items</Text>
              </View>
            </View>
            <View style={styles.titleActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Search appliances" style={styles.iconButton}>
                <Icon name="search" size={22} color={colors.onSurfaceVariant} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Sort and filter" style={styles.iconButton}>
                <Icon name="filter_list" size={22} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>
          </View>

          {isEmpty ? (
            <AppliancesEmptyState ratePerKwh={effectiveRatePerKwh(billSettings)} onAdd={openAddSheet} />
          ) : (
            <>
              <View style={styles.ribbonWrap}>
                <View style={styles.ribbon}>
                  <View>
                    <Text style={styles.ribbonLabel}>ESTIMATED MONTHLY LOAD</Text>
                    <View style={styles.ribbonValueRow}>
                      <Text style={styles.ribbonValue}>{formatPeso(baseline.cost)}</Text>
                      <Text style={styles.ribbonUnit}>/ month</Text>
                    </View>
                  </View>
                  <View style={styles.kwhPill}>
                    <Icon name="bolt" size={16} color={colors.tertiary} />
                    <Text style={styles.kwhText}>{formatWhole(baseline.kwh)} kWh</Text>
                  </View>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScroll}
                contentContainerStyle={styles.chipRow}>
                {QUICK_ADD.map(({ label, preset }) => (
                  <Pressable
                    key={label}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${label}`}
                    onPress={() => openAddSheet(preset)}
                    style={({ pressed }) => [styles.quickChip, pressed && styles.quickChipPressed]}>
                    <Icon name="add" size={18} color={colors.primary} />
                    <Text style={styles.quickChipLabel}>{label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.cardList}>
                {appliances.map((appliance) => (
                  <ApplianceCard
                    key={appliance.id}
                    appliance={appliance}
                    estimate={PLACEHOLDER_ESTIMATES[appliance.id]}
                    onPress={() => openEditSheet(appliance.id)}
                  />
                ))}
              </View>

              <View style={styles.tipCard}>
                <Icon name="tips_and_updates" size={22} color={colors.primary} />
                <View style={styles.tipBody}>
                  <Text style={styles.tipTitle}>Tip for hot afternoons</Text>
                  <Text style={styles.tipText}>
                    Running your stand fan alongside your inverter AC at 25°C delivers the same cooling sensation as 22°C
                    while saving up to ₱320/month.
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add custom appliance"
        onPress={() => openAddSheet()}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}>
        <Icon name="add" size={28} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    // Clears the FAB (56) plus its 16 margins.
    paddingBottom: 56 + spacing.margin * 2,
  },
  content: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
  },
  titleRow: {
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  title: {
    ...typography.headlineSm,
    color: colors.onSurface,
    letterSpacing: -0.2,
  },
  countBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.secondaryContainer,
  },
  countText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.inter.semiBold,
    color: colors.onSecondaryContainer,
  },
  countBadgeEmpty: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  countTextEmpty: {
    ...typography.receiptLabel,
    letterSpacing: 0,
    color: colors.onSurfaceVariant,
  },
  titleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  ribbonWrap: {
    paddingHorizontal: spacing.margin,
    marginBottom: spacing.md,
  },
  ribbon: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: shadows.level1,
  },
  ribbonLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.8,
  },
  ribbonValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginTop: 2,
  },
  ribbonValue: {
    ...typography.receiptNumericLg,
    color: colors.primary,
  },
  ribbonUnit: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  kwhPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  kwhText: {
    ...typography.receiptLabel,
    color: colors.onSurfaceVariant,
  },
  chipScroll: {
    marginBottom: spacing.md,
  },
  chipRow: {
    paddingHorizontal: spacing.margin,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  quickChip: {
    height: 48,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level1,
  },
  quickChipPressed: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  quickChipLabel: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  cardList: {
    paddingHorizontal: spacing.margin,
    gap: 12,
  },
  tipCard: {
    marginHorizontal: spacing.margin,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainer,
  },
  tipBody: {
    flex: 1,
  },
  tipTitle: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  tipText: {
    ...typography.bodyMd,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    right: spacing.margin,
    bottom: spacing.margin,
    width: 56,
    height: 56,
    borderRadius: radii.xl,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadows.level3,
  },
  fabPressed: {
    backgroundColor: colors.primary,
  },
});
