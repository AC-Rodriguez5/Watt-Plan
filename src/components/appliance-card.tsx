import type { AndroidSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CategoryChip } from '@/components/category-chip';
import { Icon } from '@/components/icon';
import { categoryColors, colors, fontFamilies, radii, shadows, spacing, typography } from '@/constants/theme';
import type { ApplianceDetailTone, PlaceholderEstimate } from '@/store/placeholder-estimates';
import type { Appliance } from '@/types/energy';
import { formatPeso } from '@/utils/format';

const APPLIANCE_ICONS: Record<string, AndroidSymbol> = {
  aircon: 'ac_unit',
  refrigerator: 'kitchen',
  tv: 'tv',
  'stand-fan': 'mode_fan',
  'rice-cooker': 'soup_kitchen',
  washer: 'local_laundry_service',
};

const DETAIL_COLORS: Record<ApplianceDetailTone, string> = {
  neutral: colors.onSurfaceVariant,
  positive: colors.tertiary,
  warning: colors.error,
};

type ApplianceCardProps = {
  appliance: Appliance;
  estimate?: PlaceholderEstimate;
  onPress: () => void;
};

export function ApplianceCard({ appliance, estimate, onPress }: ApplianceCardProps) {
  const palette = categoryColors[appliance.category];
  const detail = estimate?.detail ?? (appliance.note ? { text: appliance.note, tone: 'neutral' as const } : undefined);
  const days = appliance.daysPerWeek;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${appliance.name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.topRow}>
        <View style={styles.identity}>
          <View style={[styles.iconBadge, { backgroundColor: palette.iconBackground }]}>
            <Icon name={APPLIANCE_ICONS[appliance.id] ?? 'bolt'} size={24} color={palette.iconTint} />
          </View>
          <View style={styles.titleColumn}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{appliance.name}</Text>
              <CategoryChip category={appliance.category} />
            </View>
            <Text style={styles.specs}>
              {appliance.watts} W • {days} {days === 1 ? 'day' : 'days'} a week
            </Text>
          </View>
        </View>
        <View style={styles.costColumn}>
          <Text style={styles.cost}>{formatPeso(estimate?.monthlyCost ?? 0)}</Text>
          <Text style={styles.costUnit}>/ month</Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.meta}>
          <View style={styles.hoursPill}>
            <Icon name="schedule" size={15} color={colors.primary} />
            <Text style={styles.hoursText}>{appliance.hoursPerDay} h/day</Text>
          </View>
          {detail && (
            <View style={styles.detail}>
              {detail.tone === 'warning' && <Icon name="local_fire_department" size={14} color={DETAIL_COLORS.warning} />}
              <Text style={[styles.detailText, { color: DETAIL_COLORS[detail.tone] }]}>{detail.text}</Text>
            </View>
          )}
        </View>
        <View style={styles.chevron}>
          <Icon name="chevron_right" size={20} color={colors.onSurfaceVariant} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 12,
    boxShadow: shadows.level1,
  },
  cardPressed: {
    backgroundColor: colors.surfaceContainerLow,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleColumn: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    ...typography.titleMd,
    color: colors.onSurface,
    flexShrink: 1,
    letterSpacing: -0.2,
  },
  specs: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  costColumn: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  cost: {
    ...typography.receiptNumericMd,
    fontFamily: fontFamilies.mono.bold,
    color: colors.onSurface,
  },
  costUnit: {
    ...typography.receiptLabel,
    color: colors.onSurfaceVariant,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  hoursPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
  },
  hoursText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  detailText: {
    ...typography.labelSm,
  },
  chevron: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
