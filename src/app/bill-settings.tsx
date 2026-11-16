import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BillBreakdown } from '@/components/bill-breakdown';
import { BillCalibrationCard } from '@/components/bill-calibration-card';
import { BillInputCard } from '@/components/bill-input-card';
import { Icon } from '@/components/icon';
import { colors, maxContentWidth, radii, shadows, spacing, typography } from '@/constants/theme';
import { calibrate } from '@/optimizer/bill-calibration';
import { useAppStore } from '@/store/app-store';
import {
  amountOrNull,
  billFormFromSettings,
  tidyAmount,
  validateBillForm,
  type BillField,
  type BillFormErrors,
  type BillFormValues,
} from '@/utils/bill-form';
import { formatPeriod } from '@/utils/billing-period';

/** How long the Save button shows its confirmation. */
const SAVED_MS = 1800;

export default function BillSettingsScreen() {
  const insets = useSafeAreaInsets();

  const appliances = useAppStore((state) => state.appliances);
  const billSettings = useAppStore((state) => state.billSettings);
  const updateBillSettings = useAppStore((state) => state.updateBillSettings);
  const resetAll = useAppStore((state) => state.resetAll);

  const [values, setValues] = useState<BillFormValues>(() => billFormFromSettings(billSettings));
  const [errors, setErrors] = useState<BillFormErrors>({});
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    [],
  );

  // The summary card follows what is typed, so it previews the result before Save.
  const calibration = useMemo(
    () => calibrate(appliances, amountOrNull(values.total), amountOrNull(values.kwh)),
    [appliances, values.total, values.kwh],
  );

  const setField = (field: BillField, text: string) => {
    setValues((current) => ({ ...current, [field]: text }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const save = () => {
    const result = validateBillForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    updateBillSettings(result.value);
    setValues(billFormFromSettings(result.value));
    setErrors({});
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), SAVED_MS);
  };

  const confirmReset = () => {
    Alert.alert('Reset all data?', 'This replaces your appliances, last bill and target with the sample household. It cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          resetAll();
          router.back();
        },
      },
    ]);
  };

  const period = formatPeriod(billSettings.periodStart, billSettings.periodEnd);

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.lg + insets.bottom }]}>
        <View style={styles.content}>
          <View style={styles.intro}>
            <View style={styles.introIcon}>
              <Icon name="receipt_long" size={22} color={colors.primary} />
            </View>
            <View style={styles.introText}>
              <Text style={styles.introBody}>Copy these from your last bill.</Text>
              <View style={styles.chips}>
                {period !== '' && (
                  <View style={styles.chip}>
                    <Icon name="calendar_today" size={14} color={colors.primary} />
                    <Text style={styles.chipText}>{period}</Text>
                  </View>
                )}
                <View style={styles.chip}>
                  <Icon name="bolt" size={14} color={colors.tertiary} />
                  <Text style={styles.chipText}>{billSettings.utility}</Text>
                </View>
              </View>
            </View>
          </View>

          <BillInputCard
            label="Last bill total"
            prefix="₱"
            value={values.total}
            onChangeText={(text) => setField('total', text)}
            onBlur={() => setField('total', tidyAmount(values.total))}
            placeholder="0.00"
            maxLength={12}
            trailing={<Icon name="document_scanner" size={20} color={colors.onSurfaceVariant} />}
            helper={'"Total Amount Due" on your bill'}
            helperIcon="check_circle"
            error={errors.total}
          />

          <BillInputCard
            label="Last bill usage"
            value={values.kwh}
            onChangeText={(text) => setField('kwh', text)}
            placeholder="0"
            maxLength={6}
            trailing={
              <View style={styles.unitPill}>
                <Text style={styles.unitText}>KWH</Text>
              </View>
            }
            helper={'"Actual Consumption" on your bill'}
            error={errors.kwh}
          />

          <BillCalibrationCard calibration={calibration} />

          <BillBreakdown
            values={values}
            errors={errors}
            onChange={(field, text) => setField(field, text)}
          />

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save bill"
              onPress={save}
              style={({ pressed }) => [
                styles.saveButton,
                saved && styles.saveButtonDone,
                pressed && !saved && styles.saveButtonPressed,
              ]}>
              <Icon name={saved ? 'check' : 'save'} size={20} color={colors.onPrimary} />
              <Text style={styles.saveLabel}>{saved ? 'Saved' : 'Save bill'}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset all data"
              onPress={confirmReset}
              style={({ pressed }) => [styles.resetButton, pressed && styles.resetButtonPressed]}>
              <Icon name="restart_alt" size={18} color={colors.error} />
              <Text style={styles.resetLabel}>Reset all data</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.margin,
  },
  content: {
    width: '100%',
    maxWidth: maxContentWidth - spacing.margin * 2,
    alignSelf: 'center',
    // Groups 24 apart; the buttons get 8 more (actions paddingTop) so they sit 32 below.
    gap: spacing.lg,
  },

  intro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
    boxShadow: shadows.level1,
  },
  introIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.primaryFixed,
  },
  introText: {
    flex: 1,
    minWidth: 0,
  },
  introBody: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
  },
  chipText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },

  unitPill: {
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainer,
  },
  unitText: {
    ...typography.receiptLabel,
    color: colors.onSurfaceVariant,
  },

  actions: {
    gap: 12,
    paddingTop: spacing.sm,
  },
  saveButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.primaryContainer,
    boxShadow: shadows.level2,
  },
  saveButtonPressed: {
    backgroundColor: colors.primary,
  },
  saveButtonDone: {
    backgroundColor: colors.tertiaryContainer,
  },
  saveLabel: {
    ...typography.labelMd,
    color: colors.onPrimary,
  },
  resetButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.lg,
  },
  resetButtonPressed: {
    backgroundColor: `${colors.errorContainer}33`,
  },
  resetLabel: {
    ...typography.labelMd,
    color: colors.error,
  },
});
