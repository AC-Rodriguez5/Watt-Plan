import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, fontFamilies, radii, shadows, spacing, typography, themedStyles } from '@/constants/theme';
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
        <Text style={styles.title}>Target reached</Text>
        <Text style={styles.message}>
          Saves <Text style={styles.strong}>{formatWhole(kwhSaved)} kWh</Text> and{' '}
          <Text style={styles.strong}>{formatWhole(co2SavedKg)} kg CO₂</Text> a month.
        </Text>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
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
  title: {
    ...typography.titleMd,
    fontFamily: fontFamilies.inter.bold,
    color: colors.tertiary,
  },
  message: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  strong: {
    fontFamily: fontFamilies.inter.semiBold,
    color: colors.onSurface,
  },
}));
