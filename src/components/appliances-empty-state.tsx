import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, fontFamilies, radii, shadows, spacing, typography } from '@/constants/theme';
import { formatPeso } from '@/utils/format';

/** Order and wording as drawn in design/screens/appliances_empty.png. */
const SUGGESTIONS = ['Refrigerator', 'Aircon', 'Stand fan', 'Rice cooker', 'Television', 'Washing machine'];

type AppliancesEmptyStateProps = {
  /** Pesos per kWh the estimate uses: the household's own rate, or the default one. */
  ratePerKwh: number;
  /** Opens the add-appliance sheet. */
  onAdd: () => void;
};

/** Body of the Appliances tab while the list is empty (design/screens/appliances_empty.png). */
export function AppliancesEmptyState({ ratePerKwh, onAdd }: AppliancesEmptyStateProps) {
  return (
    <>
      {/* With no appliances there is nothing to add up: no pesos and no kWh. */}
      <View style={styles.ribbonWrap}>
        <View style={styles.ribbon}>
          <View style={styles.ribbonTop}>
            <Text style={styles.ribbonLabel}>ESTIMATED MONTHLY LOAD</Text>
            <View style={styles.kwhPill}>
              <Icon name="bolt" size={14} color={colors.onSurfaceVariant} />
              <Text style={styles.kwhText}>0 kWh</Text>
            </View>
          </View>
          <View style={styles.ribbonBottom}>
            <View style={styles.valueRow}>
              <Text style={styles.value}>{formatPeso(0)}</Text>
              <Text style={styles.unit}>/ month</Text>
            </View>
            <View style={styles.ratePill}>
              <Text style={styles.rateText}>Base Rate: ₱{ratePerKwh.toFixed(2)}/kWh</Text>
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.suggestionsLabel}>QUICK ADD SUGGESTIONS</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}>
        {SUGGESTIONS.map((label) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={`Add ${label}`}
            onPress={onAdd}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
            <Icon name="add" size={18} color={colors.primary} />
            <Text style={styles.chipLabel}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>
          No appliances yet. Tap a chip above or <Text style={styles.plus}>+</Text> to add one.
        </Text>
      </View>

      <View style={styles.tipCard}>
        <View style={styles.tipBadge}>
          <Icon name="lightbulb" size={20} color={colors.onSecondaryContainer} />
        </View>
        <View style={styles.tipBody}>
          <Text style={styles.tipTitle}>Smart saving strategy</Text>
          <Text style={styles.tipText}>
            Tip: Adding your high-draw appliances first (like Aircon and Refrigerator) gives the fastest path to
            cutting your bill.
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // Estimated monthly load card
  ribbonWrap: {
    paddingHorizontal: spacing.margin,
    marginBottom: spacing.md,
  },
  ribbon: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level1,
  },
  ribbonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ribbonLabel: {
    ...typography.receiptLabel,
    color: colors.onSurfaceVariant,
  },
  kwhPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
  },
  kwhText: {
    ...typography.receiptLabel,
    color: colors.onSurfaceVariant,
  },
  ribbonBottom: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  value: {
    ...typography.headlineLg,
    fontFamily: fontFamilies.mono.bold,
    color: colors.onSurface,
  },
  unit: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  ratePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainer,
  },
  rateText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },

  // Quick add suggestions
  suggestionsLabel: {
    ...typography.labelSm,
    paddingHorizontal: spacing.margin,
    paddingBottom: spacing.xs,
    fontFamily: fontFamilies.inter.semiBold,
    letterSpacing: 0.8,
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
  chip: {
    height: 48,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerLow,
    boxShadow: shadows.level1,
  },
  chipPressed: {
    backgroundColor: colors.surfaceContainer,
  },
  chipLabel: {
    ...typography.labelMd,
    color: colors.onSurface,
  },

  // Message card
  emptyCard: {
    minHeight: 220,
    marginHorizontal: spacing.margin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level1,
  },
  emptyText: {
    ...typography.bodyLg,
    maxWidth: 280,
    textAlign: 'center',
    lineHeight: 28,
    color: colors.onSurfaceVariant,
  },
  plus: {
    fontFamily: fontFamilies.mono.bold,
    color: colors.primary,
  },

  // Tip card
  tipCard: {
    marginHorizontal: spacing.margin,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
    boxShadow: shadows.level1,
  },
  tipBadge: {
    width: 36,
    height: 36,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.secondaryContainer,
  },
  tipBody: {
    flex: 1,
    gap: 2,
  },
  tipTitle: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  tipText: {
    ...typography.bodyMd,
    lineHeight: 22,
    color: colors.onSurfaceVariant,
  },
});
