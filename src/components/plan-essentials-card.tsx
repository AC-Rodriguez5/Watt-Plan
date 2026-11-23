import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, fontFamilies, radii, spacing, typography, themedStyles } from '@/constants/theme';
import { formatPeso } from '@/utils/format';

type PlanEssentialsCardProps = {
  /** Lowest bill the household can reach, in pesos per month. */
  lowestBill: number;
};

/** Explains why the target cannot be reached (design/screens/plan_not_reachable.png). */
export function PlanEssentialsCard({ lowestBill }: PlanEssentialsCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <Icon name="info" size={22} color={colors.error} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Your essentials alone cost about {formatPeso(lowestBill)} a month.</Text>
        <Text style={styles.message}>They can&apos;t be cut any further.</Text>
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
    backgroundColor: `${colors.errorContainer}66`,
  },
  badge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.errorContainer,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.titleMd,
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurface,
  },
  message: {
    ...typography.labelSm,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
}));
