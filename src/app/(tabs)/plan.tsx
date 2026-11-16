import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Icon } from '@/components/icon';
import { MissingBillBanner } from '@/components/missing-bill-banner';
import { PlanApplianceList } from '@/components/plan-appliance-list';
import { PlanEssentialsCard } from '@/components/plan-essentials-card';
import { PlanRateCard } from '@/components/plan-rate-card';
import { PlanStatusCard } from '@/components/plan-status-card';
import { PlanTargetAlertCard } from '@/components/plan-target-alert-card';
import { PlanTargetCard } from '@/components/plan-target-card';
import { Receipt } from '@/components/receipt';
import { Snackbar } from '@/components/snackbar';
import { StrategyToggle } from '@/components/strategy-toggle';
import { colors, maxContentWidth, radii, shadows, spacing, typography } from '@/constants/theme';
import { calibrate } from '@/optimizer/bill-calibration';
import { planApplianceRows } from '@/optimizer/plan-appliances';
import { lowestReachableTarget } from '@/optimizer/plan-revision';
import { useAppStore } from '@/store/app-store';
import { formatPeso } from '@/utils/format';

export default function PlanScreen() {
  const appliances = useAppStore((state) => state.appliances);
  const billSettings = useAppStore((state) => state.billSettings);
  const target = useAppStore((state) => state.target);
  const planMode = useAppStore((state) => state.planMode);
  const plan = useAppStore((state) => state.plan);
  const baseline = useAppStore((state) => state.baseline);
  const setPlanMode = useAppStore((state) => state.setPlanMode);
  const setTarget = useAppStore((state) => state.setTarget);
  const [snackbar, setSnackbar] = useState<{ id: number; message: string; previousTarget: number | null; newTarget: number } | null>(null);
  const dismissSnackbar = useCallback(() => setSnackbar(null), []);

  const { ratePerKwh, isCalibrated } = useMemo(
    () => calibrate(appliances, billSettings.lastBillTotal, billSettings.lastBillKwh),
    [appliances, billSettings.lastBillTotal, billSettings.lastBillKwh],
  );
  const utility = billSettings.utility.split(' ')[0];
  const rateSource = isCalibrated ? `Matched to ${utility} bill` : 'Default rate';
  const applianceRows = useMemo(() => (plan ? planApplianceRows(baseline, plan) : []), [baseline, plan]);
  const notReachable = plan?.status === 'not-reachable';
  const editTarget = () => router.push('/target-edit');

  // "Use this plan" accepts the max-cuts plan: the target becomes the lowest bill the household can reach.
  const acceptLowestPlan = () => {
    if (!plan) return;
    const newTarget = lowestReachableTarget(plan);
    setSnackbar({ id: Date.now(), message: `Target set to ${formatPeso(newTarget)}`, previousTarget: target, newTarget });
    setTarget(newTarget);
  };

  // Puts the old target back, unless the user has already changed it again since.
  const undoAcceptLowestPlan = () => {
    if (snackbar && useAppStore.getState().target === snackbar.newTarget) setTarget(snackbar.previousTarget);
    setSnackbar(null);
  };

  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {!isCalibrated && <MissingBillBanner onEnterBill={() => router.push('/bill-settings')} />}

          {notReachable && target !== null ? (
            <PlanTargetAlertCard
              target={target}
              ratePerKwh={ratePerKwh}
              rateSource={rateSource}
              onEditTarget={editTarget}
              onEditRate={() => router.push('/bill-settings')}
            />
          ) : (
            <>
              <View style={styles.subHeader}>
                <View style={styles.subHeaderTitle}>
                  <View style={styles.subHeaderBadge}>
                    <Icon name="receipt_long" size={18} color={colors.onSecondaryContainer} />
                  </View>
                  <Text style={styles.subHeaderLabel}>Billing Optimization</Text>
                </View>
                <View style={styles.subHeaderActions}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Share plan" style={styles.iconButton}>
                    <Icon name="share" size={24} color={colors.onSurfaceVariant} />
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Plan information" style={styles.iconButton}>
                    <Icon name="info" size={24} color={colors.onSurfaceVariant} />
                  </Pressable>
                </View>
              </View>

              {target !== null && <PlanTargetCard target={target} onEdit={editTarget} />}

              <PlanRateCard ratePerKwh={ratePerKwh} source={rateSource} onEdit={() => router.push('/bill-settings')} />
            </>
          )}

          <StrategyToggle value={planMode} onChange={setPlanMode} />

          {plan && (
            <>
              <Receipt
                status={plan.status}
                currentEstimate={plan.currentEstimate}
                target={plan.target}
                projectedBill={plan.projectedBill}
              />
              <PlanApplianceList rows={applianceRows} />
            </>
          )}

          {plan?.status === 'feasible' && <PlanStatusCard kwhSaved={plan.kwhSaved} co2SavedKg={plan.co2SavedKg} />}

          {plan && notReachable && <PlanEssentialsCard lowestBill={plan.projectedBill} />}

          {notReachable ? (
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Use this plan"
                onPress={acceptLowestPlan}
                style={({ pressed }) => [styles.pillButton, styles.primaryPill, pressed && styles.buttonPressed]}>
                <Icon name="check_circle" size={20} color={colors.onPrimary} />
                <Text style={styles.buttonLabel}>Use this plan</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change my target"
                onPress={editTarget}
                style={({ pressed }) => [styles.pillButton, styles.tonalPill, pressed && styles.tonalPillPressed]}>
                <Icon name="edit_note" size={20} color={colors.primary} />
                <Text style={styles.tonalLabel}>Change my target</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change the plan"
                onPress={() => router.push('/plan-chat')}
                style={({ pressed }) => [styles.pillButton, styles.outlinedPill, pressed && styles.outlinedPillPressed]}>
                <Icon name="tune" size={20} color={colors.onSurface} />
                <Text style={styles.outlinedLabel}>Change the plan</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.cta}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change the plan"
                onPress={() => router.push('/plan-chat')}
                style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
                <Icon name="tune" size={22} color={colors.onPrimary} />
                <Text style={styles.buttonLabel}>Change the plan</Text>
              </Pressable>
              <View style={styles.caption}>
                <Icon name="lock_clock" size={16} color={colors.tertiary} />
                <Text style={styles.captionText}>Locks in daily schedule reminders &amp; push triggers</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {snackbar && (
        <Snackbar
          key={snackbar.id}
          message={snackbar.message}
          actionLabel="Undo"
          onAction={undoAcceptLowestPlan}
          onDismiss={dismissSnackbar}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.margin,
  },
  content: {
    width: '100%',
    maxWidth: maxContentWidth - spacing.margin * 2,
    alignSelf: 'center',
    gap: spacing.md,
  },

  // "Billing Optimization" bar
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  subHeaderBadge: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.secondaryContainer,
  },
  subHeaderLabel: {
    ...typography.labelMd,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.onSurfaceVariant,
  },
  subHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },

  // Change the plan
  cta: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  button: {
    width: '100%',
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.primaryContainer,
    boxShadow: shadows.level2,
  },
  buttonPressed: {
    backgroundColor: colors.primary,
  },
  buttonLabel: {
    ...typography.labelMd,
    color: colors.onPrimary,
  },
  caption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
  },
  captionText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },

  // Use this plan / Change my target (target not reachable)
  actions: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  pillButton: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.full,
  },
  primaryPill: {
    backgroundColor: colors.primary,
    boxShadow: shadows.level2,
  },
  tonalPill: {
    backgroundColor: colors.surfaceContainer,
  },
  tonalPillPressed: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  tonalLabel: {
    ...typography.labelMd,
    color: colors.primary,
  },
  // Outlined Secondary (design/DESIGN.md): transparent, 1.5dp border, border turns blue when pressed.
  outlinedPill: {
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
  },
  outlinedPillPressed: {
    borderColor: colors.primaryContainer,
  },
  outlinedLabel: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
});
