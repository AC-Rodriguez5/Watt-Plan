import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, fontFamilies, radii, shadows, spacing, typography } from '@/constants/theme';
import { formatWhole } from '@/utils/format';

type PlanStatusCardProps = {
  /** kWh per month the plan saves. */
  kwhSaved: number;
  /** kg of CO₂ per month the plan avoids. */
  co2SavedKg: number;
};

/** "Target reached" message with the energy and CO₂ saved (design/screens/plan.png). */
export function PlanStatusCard({ kwhSaved, co2SavedKg }: PlanStatusCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <Icon name="verified" size={24} color={colors.tertiary} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Target reached</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Feasible</Text>
          </View>
        </View>
        <Text style={styles.message}>
          <Text style={styles.strong}>{formatWhole(kwhSaved)} kWh</Text> and{' '}
          <Text style={styles.strong}>{formatWhole(co2SavedKg)} kg CO₂</Text> saved this cycle while preserving core
          appliance schedules.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level1,
  },
  badge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: `${colors.tertiaryContainer}26`,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.titleMd,
    fontFamily: fontFamilies.inter.bold,
    color: colors.tertiary,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.tertiaryFixed,
  },
  pillText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.inter.bold,
    fontSize: 11,
    color: colors.onTertiaryFixedVariant,
  },
  message: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  strong: {
    fontFamily: fontFamilies.inter.semiBold,
    color: colors.onSurface,
  },
});
