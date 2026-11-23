import { Pressable, Text, View } from 'react-native';

import { CategoryChip } from '@/components/category-chip';
import { Icon } from '@/components/icon';
import { categoryColors, colors, fontFamilies, radii, shadows, spacing, typography, themedStyles } from '@/constants/theme';
import type { Appliance } from '@/types/energy';
import { applianceIcon } from '@/utils/appliance-icon';
import { formatPercent, formatPeso } from '@/utils/format';

type ApplianceCardProps = {
  appliance: Appliance;
  /** Pesos per month, from the optimizer's baseline. */
  monthlyCost: number;
  /** Share of the household's bill, 0 to 1. Set only on the costliest appliance, which is flagged in orange. */
  shareOfBill: number | null;
  onPress: () => void;
};

export function ApplianceCard({ appliance, monthlyCost, shareOfBill, onPress }: ApplianceCardProps) {
  const palette = categoryColors[appliance.category];
  // The costliest appliance shows its share of the bill in place of its note.
  const detail =
    shareOfBill !== null
      ? { text: `${formatPercent(shareOfBill)} of bill`, warning: true }
      : appliance.note
        ? { text: appliance.note, warning: false }
        : undefined;
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
            <Icon name={applianceIcon(appliance.name)} size={24} color={palette.iconTint} />
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
          <Text style={styles.cost}>{formatPeso(monthlyCost)}</Text>
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
              {detail.warning && <Icon name="local_fire_department" size={14} color={colors.alert} />}
              <Text style={[styles.detailText, { color: detail.warning ? colors.alertAction : colors.onSurfaceVariant }]}>
                {detail.text}
              </Text>
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

const styles = themedStyles(() => ({
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
}));
