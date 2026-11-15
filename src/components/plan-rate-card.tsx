import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, fontFamilies, radii, spacing, typography } from '@/constants/theme';
import { formatRate } from '@/utils/format';

type PlanRateCardProps = {
  ratePerKwh: number;
  /** Where the rate came from, e.g. "Matched to Meralco bill". */
  source: string;
  onEdit: () => void;
};

/** Rate card under the target card; "Edit" opens Bill settings (design/screens/plan.png). */
export function PlanRateCard({ ratePerKwh, source, onEdit }: PlanRateCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.text}>
        <Icon name="speed" size={20} color={colors.secondary} />
        <Text style={styles.line} numberOfLines={1}>
          <Text style={styles.rate}>{formatRate(ratePerKwh)}</Text>
          <Text style={styles.dot}> • </Text>
          {source}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Edit rate in Bill settings"
        onPress={onEdit}
        style={({ pressed }) => [styles.edit, pressed && styles.editPressed]}>
        <Text style={styles.editLabel}>Edit</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  text: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  line: {
    ...typography.bodyMd,
    flex: 1,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  rate: {
    ...typography.receiptLabel,
    fontFamily: fontFamilies.mono.bold,
    color: colors.onSurface,
  },
  dot: {
    fontSize: 10,
    color: colors.outline,
  },
  edit: {
    minWidth: 48,
    height: 48,
    paddingHorizontal: spacing.sm + spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  editPressed: {
    backgroundColor: colors.surfaceContainer,
  },
  editLabel: {
    ...typography.labelMd,
    color: colors.primary,
  },
});
