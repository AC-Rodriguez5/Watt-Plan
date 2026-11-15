import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';

type BillInputCardProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  /** Peso sign drawn before the value. */
  prefix?: string;
  placeholder: string;
  /** Pill or icon drawn after the value. */
  trailing?: ReactNode;
  /** Helper line under the field. Replaced by `error` when there is one. */
  helper: string;
  helperIcon?: 'check_circle';
  error?: string;
};

/** White card with a label, a large mono value and a helper line (design/screens/bill_settings.png). */
export function BillInputCard({
  label,
  value,
  onChangeText,
  onBlur,
  prefix,
  placeholder,
  trailing,
  helper,
  helperIcon,
  error,
}: BillInputCardProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.card, focused && styles.cardFocused, !!error && styles.cardError]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={colors.outlineVariant}
          selectionColor={colors.primaryContainer}
          style={styles.input}
        />
        {trailing}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <View style={styles.helperRow}>
          {helperIcon && <Icon name={helperIcon} size={14} color={colors.outline} />}
          <Text style={styles.helper}>{helper}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level1,
  },
  cardFocused: {
    borderColor: colors.primaryContainer,
    boxShadow: shadows.level2,
  },
  cardError: {
    borderColor: colors.alert,
  },
  label: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  inputRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  prefix: {
    ...typography.receiptNumericLg,
    color: colors.onSurfaceVariant,
  },
  input: {
    ...typography.receiptNumericLg,
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    color: colors.onSurface,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 6,
  },
  helper: {
    ...typography.labelSm,
    flexShrink: 1,
    color: colors.outline,
  },
  error: {
    ...typography.labelSm,
    marginTop: 6,
    color: colors.error,
  },
});
