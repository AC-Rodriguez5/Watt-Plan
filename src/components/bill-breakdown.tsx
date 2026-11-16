import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { chargeShare, chargesMatchTotal, sumCharges } from '@/optimizer/bill-calibration';
import { amountOrNull, tidyAmount, type BillFormErrors, type BillFormValues } from '@/utils/bill-form';
import { formatPesoExact } from '@/utils/format';

type ChargeField = 'generation' | 'distribution' | 'taxes';

const CHARGES: { field: ChargeField; label: string }[] = [
  { field: 'generation', label: 'Generation charge' },
  { field: 'distribution', label: 'Distribution charge' },
  { field: 'taxes', label: 'Taxes and other charges' },
];

type BillBreakdownProps = {
  values: BillFormValues;
  errors: BillFormErrors;
  onChange: (field: ChargeField, text: string) => void;
};

/** Optional itemized bill. Collapsed until the user opens it. */
export function BillBreakdown({ values, errors, onChange }: BillBreakdownProps) {
  const [expanded, setExpanded] = useState(false);

  const total = amountOrNull(values.total);
  const charges = CHARGES.map(({ field }) => amountOrNull(values[field]));
  const sum = sumCharges(charges);
  const matches = chargesMatchTotal(charges, total);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Break down the charges"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}>
        <View style={styles.triggerLeft}>
          <Icon name="account_balance_wallet" size={20} color={colors.primary} />
          <View style={styles.triggerText}>
            <Text style={styles.title}>Break down the charges</Text>
            <Text style={styles.subtitle}>Optional</Text>
          </View>
        </View>
        <View style={[styles.chevron, expanded && styles.chevronOpen]}>
          <Icon name="expand_more" size={20} color={colors.onSurfaceVariant} />
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          {CHARGES.map(({ field, label }, index) => (
            <ChargeInput
              key={field}
              label={label}
              value={values[field]}
              share={chargeShare(charges[index], total)}
              error={errors[field]}
              onChangeText={(text) => onChange(field, text)}
            />
          ))}

          <View style={styles.verify}>
            <Text style={styles.verifyLabel}>Charges add up to:</Text>
            <Text style={[styles.verifyValue, !matches && styles.verifyMismatch]}>
              {formatPesoExact(sum)}
              {matches ? ' ✓' : ''}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

type ChargeInputProps = {
  label: string;
  value: string;
  share: number | null;
  error?: string;
  onChangeText: (text: string) => void;
};

function ChargeInput({ label, value, share, error, onChangeText }: ChargeInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View>
      <View style={[styles.charge, focused && styles.chargeFocused, !!error && styles.chargeError]}>
        <View style={styles.chargeTop}>
          <Text style={styles.chargeLabel}>{label}</Text>
          <Text style={styles.share}>{share === null ? '—' : `${(share * 100).toFixed(1)}%`}</Text>
        </View>
        <View style={styles.chargeInputRow}>
          <Text style={styles.peso}>₱</Text>
          <TextInput
            accessibilityLabel={`${label} in pesos`}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              onChangeText(tidyAmount(value));
            }}
            keyboardType="decimal-pad"
            maxLength={12}
            selectionColor={colors.primaryContainer}
            style={styles.chargeInput}
          />
        </View>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level1,
  },
  trigger: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  triggerPressed: {
    backgroundColor: `${colors.surfaceContainerLow}80`,
  },
  triggerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  triggerText: {
    flex: 1,
  },
  title: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  subtitle: {
    ...typography.labelSm,
    color: colors.outline,
  },
  chevron: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  body: {
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  charge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceContainerLow,
  },
  chargeFocused: {
    borderColor: colors.primaryContainer,
  },
  chargeError: {
    borderColor: colors.alert,
  },
  chargeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chargeLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  share: {
    ...typography.receiptLabel,
    color: colors.outline,
  },
  chargeInputRow: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  peso: {
    ...typography.receiptNumericMd,
    color: colors.onSurfaceVariant,
  },
  chargeInput: {
    ...typography.receiptNumericMd,
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    color: colors.onSurface,
  },
  error: {
    ...typography.labelSm,
    marginTop: 6,
    paddingHorizontal: spacing.xs,
    color: colors.error,
  },
  verify: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  verifyLabel: {
    ...typography.labelSm,
    color: colors.outline,
  },
  verifyValue: {
    ...typography.receiptNumericMd,
    color: colors.onSurface,
  },
  verifyMismatch: {
    color: colors.alert,
  },
});
