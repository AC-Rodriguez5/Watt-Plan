import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, fontFamilies, radii, spacing } from '@/constants/theme';

type MissingBillBannerProps = {
  /** Opens Bill settings. */
  onEnterBill: () => void;
};

/** Notice at the top of the Plan tab while no bill is saved (design/screens/plan_missing_bill.png). */
export function MissingBillBanner({ onEnterBill }: MissingBillBannerProps) {
  return (
    <View style={styles.banner}>
      <View style={styles.message}>
        <Icon name="error" size={20} color={colors.alert} />
        <Text style={styles.text}>Plan uses a default rate. Enter your last bill for accuracy.</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Enter your last bill"
        onPress={onEnterBill}
        style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
        <Text style={styles.actionLabel}>Enter bill</Text>
        <Icon name="chevron_right" size={16} color={colors.alertAction} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs,
    borderWidth: 1,
    borderColor: colors.alertBorder,
    borderRadius: radii.lg,
    backgroundColor: colors.alertContainer,
  },
  message: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  text: {
    flex: 1,
    fontFamily: fontFamilies.inter.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onAlertContainer,
  },
  action: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  actionPressed: {
    backgroundColor: colors.alertContainerPressed,
  },
  actionLabel: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.alertAction,
  },
});
