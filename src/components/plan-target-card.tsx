import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { formatPeso } from '@/utils/format';

type PlanTargetCardProps = {
  /** Monthly target in pesos. */
  target: number;
  onEdit?: () => void;
};

/** "Monthly budget target" card at the top of the Plan tab (design/screens/plan.png). */
export function PlanTargetCard({ target, onEdit }: PlanTargetCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Edit budget target"
      onPress={onEdit}
      style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>Monthly budget target</Text>
        <View style={styles.editButton}>
          <Icon name="edit" size={20} color={colors.primary} />
        </View>
      </View>
      <View style={styles.amountRow}>
        <Text style={styles.amount}>{formatPeso(target)}</Text>
        <Text style={styles.unit}>/ month</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  },
  label: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  editButton: {
    width: 40,
    height: 40,
    marginRight: -spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  amount: {
    ...typography.receiptNumericLg,
    fontSize: 34,
    lineHeight: 40,
    color: colors.onSurface,
  },
  unit: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
});
