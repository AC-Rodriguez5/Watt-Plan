import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { DashedRule } from '@/components/receipt';
import { colors, fontFamilies, radii, shadows, spacing, typography, themedStyles } from '@/constants/theme';
import { formatPeso, formatRate } from '@/utils/format';

type PlanTargetAlertCardProps = {
  /** Monthly target in pesos. */
  target: number;
  ratePerKwh: number;
  /** Where the rate came from, e.g. "Matched to Meralco bill". */
  rateSource: string;
  onEditTarget?: () => void;
  onEditRate: () => void;
};

/**
 * Target card with the rate strip inside it, used when the target cannot be reached
 * (design/screens/plan_not_reachable.png).
 */
export function PlanTargetAlertCard({ target, ratePerKwh, rateSource, onEditTarget, onEditRate }: PlanTargetAlertCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>MONTHLY BUDGET TARGET</Text>
        <View style={styles.badge}>
          <Icon name="warning" size={14} color={colors.onErrorContainer} />
          <Text style={styles.badgeText}>Too low</Text>
        </View>
      </View>

      <View style={styles.amountRow}>
        <View style={styles.amountGroup}>
          <Text style={styles.amount}>{formatPeso(target)}</Text>
          <Text style={styles.unit}>/ month</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit budget target"
          onPress={onEditTarget}
          style={({ pressed }) => [styles.editButton, pressed && styles.editButtonPressed]}>
          <Icon name="edit" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <DashedRule />

      <View style={styles.rateRow}>
        <View style={styles.rateText}>
          <Icon name="bolt" size={16} color={colors.primary} />
          <Text style={styles.rate} numberOfLines={2}>
            {formatRate(ratePerKwh)} · {rateSource}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit rate in Bill settings"
          onPress={onEditRate}
          style={styles.rateEdit}>
          <Text style={styles.rateEditLabel}>Edit</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  label: {
    ...typography.labelSm,
    flexShrink: 1,
    letterSpacing: 0.6,
    color: colors.onSurfaceVariant,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.errorContainer,
  },
  badgeText: {
    ...typography.labelSm,
    color: colors.onErrorContainer,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  amount: {
    ...typography.receiptNumericLg,
    fontSize: 28,
    lineHeight: 36,
    color: colors.onSurface,
  },
  unit: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  editButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
  },
  editButtonPressed: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rateText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rate: {
    ...typography.receiptLabel,
    flex: 1,
    color: colors.onSurfaceVariant,
  },
  rateEdit: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  rateEditLabel: {
    ...typography.labelMd,
    fontFamily: fontFamilies.inter.semiBold,
    color: colors.primary,
  },
}));
