import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { CategoryChip } from '@/components/category-chip';
import { Icon } from '@/components/icon';
import { categoryColors, colors, fontFamilies, radii, shadows, spacing, typography } from '@/constants/theme';
import type { CostlyAppliance, HomeSummary } from '@/optimizer/home-summary';
import type { BillSettings } from '@/types/energy';
import { applianceIcon } from '@/utils/appliance-icon';
import { billingDay, formatPeriod } from '@/utils/billing-period';
import { formatPeso, formatWhole } from '@/utils/format';

type HomeDashboardProps = {
  summary: HomeSummary;
  bill: BillSettings;
};

/** Home tab once appliances and a last bill exist (design/screens/home.png). */
export function HomeDashboard({ summary, bill }: HomeDashboardProps) {
  return (
    <View style={styles.stack}>
      <CycleRibbon summary={summary} bill={bill} />
      <BudgetCard summary={summary} />
      <CostliestCard summary={summary} />
      <View style={styles.metricsRow}>
        <MetricCard
          label="Energy Drawn"
          icon="bolt"
          iconBackground={colors.secondaryFixed}
          iconColor={colors.onSecondaryFixed}
          value={formatWhole(summary.kwh)}
          unit="kWh"
          caption="a month"
        />
        <MetricCard
          label="Carbon Footprint"
          icon="eco"
          iconBackground={colors.tertiaryFixed}
          iconColor={colors.onTertiaryFixed}
          value={formatWhole(summary.co2Kg)}
          unit="kg"
          caption={`About ${formatWhole(summary.co2Kg)} kg CO₂`}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Make a plan"
        onPress={() => router.navigate('/plan')}
        style={({ pressed }) => [styles.planButton, pressed && styles.planButtonPressed]}>
        <Icon name="receipt_long" size={24} color={colors.onPrimary} />
        <Text style={styles.planButtonLabel}>Make a plan</Text>
        <Icon name="arrow_forward" size={20} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

function CycleRibbon({ summary, bill }: HomeDashboardProps) {
  const period = formatPeriod(bill.periodStart, bill.periodEnd);
  const day = billingDay(bill.periodStart, bill.periodEnd);
  // "Meralco Residential" -> "Meralco": the card only has room for the utility's name.
  const utility = bill.utility.split(' ')[0];

  return (
    <View style={styles.ribbon}>
      <View style={styles.ribbonText}>
        <Icon name="calendar_today" size={18} color={colors.primary} />
        <Text style={styles.ribbonLabel} numberOfLines={1}>
          {period} •{' '}
          <Text style={styles.ribbonRate}>
            {utility} ₱{summary.ratePerKwh.toFixed(2)}/kWh
          </Text>
        </Text>
      </View>
      {day !== null && (
        <View style={styles.dayPill}>
          <Text style={styles.dayPillText}>Day {day}</Text>
        </View>
      )}
    </View>
  );
}

function BudgetCard({ summary }: { summary: HomeSummary }) {
  const { estimatedBill, target, isOverTarget, excess, overGoal, barFill, goalShare, tip } = summary;
  const goalFlex = barFill * goalShare;
  const excessFlex = barFill - goalFlex;
  const emptyFlex = 1 - barFill;

  return (
    <View style={styles.card}>
      <View style={styles.accent}>
        <Svg width="100%" height={6} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.primary} />
              <Stop offset="0.5" stopColor={colors.secondary} />
              <Stop offset="1" stopColor={colors.error} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height={6} fill="url(#accent)" />
        </Svg>
      </View>

      <View style={styles.budgetHeader}>
        <View style={styles.budgetTitleRow}>
          <Text style={styles.budgetTitle}>Estimated bill this month</Text>
          <Icon name="info" size={18} color={colors.outline} />
        </View>
        {isOverTarget && (
          <View style={styles.overPace}>
            <Text style={styles.overPaceText}>OVER PACE</Text>
          </View>
        )}
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.amount}>{formatPeso(estimatedBill)}</Text>
        <Text style={styles.cents}>.00</Text>
      </View>

      {target !== null && (
        <View style={styles.targetRow}>
          <View style={styles.targetGroup}>
            <Text style={styles.targetLabel}>Target:</Text>
            <Text style={styles.targetValue}>{formatPeso(target)}</Text>
          </View>
          {isOverTarget && <Text style={styles.overGoal}>+{Math.round(overGoal * 100)}% of goal</Text>}
        </View>
      )}

      <View style={styles.track}>
        {goalFlex > 0 && <View style={[styles.goalFill, { flex: goalFlex }]} />}
        {excessFlex > 0 && <View style={[styles.excessFill, { flex: excessFlex }]} />}
        {emptyFlex > 0 && <View style={{ flex: emptyFlex }} />}
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legend}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendLabel}>Goal</Text>
          {isOverTarget && (
            <>
              <View style={[styles.dot, styles.dotSpaced, { backgroundColor: colors.error }]} />
              <Text style={styles.legendExcess}>Excess</Text>
            </>
          )}
        </View>
        {isOverTarget && (
          <View style={styles.cutBadge}>
            <Icon name="trending_up" size={16} color={colors.error} />
            <Text style={styles.cutBadgeText}>{formatPeso(excess)} to cut</Text>
          </View>
        )}
      </View>

      {tip && (
        <View style={styles.tip}>
          <Icon name="tips_and_updates" size={20} color={colors.primary} />
          <Text style={styles.tipText}>
            Running your {tip.applianceName} 1 hour less a day saves roughly{' '}
            <Text style={styles.tipStrong}>{formatPeso(tip.saving)}</Text> this billing cycle!
          </Text>
        </View>
      )}
    </View>
  );
}

function CostliestCard({ summary }: { summary: HomeSummary }) {
  const { topCosts, applianceCount } = summary;

  return (
    <View style={[styles.card, styles.costliestCard]}>
      <View style={styles.costliestHeader}>
        <View style={styles.costliestTitleGroup}>
          <View style={styles.meterBadge}>
            <Icon name="electric_meter" size={20} color={colors.primary} />
          </View>
          <Text style={styles.costliestTitle}>What&apos;s costing you most</Text>
        </View>
        <Text style={styles.topCount}>
          Top {topCosts.length} of {applianceCount}
        </Text>
      </View>

      <View style={styles.costList}>
        {topCosts.map((item) => (
          <CostRow key={item.appliance.id} item={item} />
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="See all appliances"
        onPress={() => router.navigate('/appliances')}
        style={({ pressed }) => [styles.seeAll, pressed && styles.seeAllPressed]}>
        <Text style={styles.seeAllLabel}>See all appliances</Text>
        <Icon name="arrow_forward" size={18} color={colors.primary} />
      </Pressable>
    </View>
  );
}

function CostRow({ item }: { item: CostlyAppliance }) {
  const { appliance, cost, share } = item;
  const palette = categoryColors[appliance.category];

  return (
    <View style={styles.costRow}>
      <View style={styles.costRowTop}>
        <View style={styles.costIdentity}>
          <View style={styles.costIcon}>
            <Icon name={applianceIcon(appliance.id)} size={22} color={palette.iconTint} />
          </View>
          <View style={styles.costText}>
            <View style={styles.costNameRow}>
              <Text style={styles.costName} numberOfLines={1}>
                {appliance.name}
              </Text>
              <CategoryChip category={appliance.category} />
            </View>
            <Text style={styles.costSpecs} numberOfLines={1}>
              {appliance.watts} W • {appliance.hoursPerDay} hrs/day
            </Text>
          </View>
        </View>
        <View style={styles.costAmount}>
          <Text style={styles.costValue}>{formatPeso(cost)}</Text>
          <Text style={styles.costUnit}>/ month</Text>
        </View>
      </View>
      <View style={styles.costTrack}>
        <View style={[styles.costFill, { width: `${Math.round(share * 100)}%`, backgroundColor: palette.barColor }]} />
      </View>
    </View>
  );
}

type MetricCardProps = {
  label: string;
  icon: 'bolt' | 'eco';
  iconBackground: string;
  iconColor: string;
  value: string;
  unit: string;
  caption: string;
};

function MetricCard({ label, icon, iconBackground, iconColor, value, unit, caption }: MetricCardProps) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricTop}>
        <Text style={styles.metricLabel}>{label}</Text>
        <View style={[styles.metricIcon, { backgroundColor: iconBackground }]}>
          <Icon name={icon} size={18} color={iconColor} />
        </View>
      </View>
      <View>
        <Text style={styles.metricValue}>
          {value} <Text style={styles.metricUnit}>{unit}</Text>
        </Text>
        <Text style={styles.metricCaption}>{caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },

  // Billing cycle ribbon
  ribbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  ribbonText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ribbonLabel: {
    ...typography.labelSm,
    flexShrink: 1,
    color: colors.onSurfaceVariant,
  },
  ribbonRate: {
    ...typography.receiptLabel,
    color: colors.onSurface,
  },
  dayPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.secondaryContainer,
  },
  dayPillText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.inter.semiBold,
    color: colors.onSecondaryContainer,
  },

  // Shared card surface
  card: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level2,
  },

  // Budget card
  accent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  budgetTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  budgetTitle: {
    ...typography.bodyMd,
    flexShrink: 1,
    color: colors.onSurfaceVariant,
  },
  overPace: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.md,
    backgroundColor: `${colors.errorContainer}66`,
  },
  overPaceText: {
    ...typography.receiptLabel,
    fontFamily: fontFamilies.mono.bold,
    color: colors.onErrorContainer,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  amount: {
    ...typography.receiptNumericLg,
    fontSize: 38,
    lineHeight: 46,
    color: colors.onSurface,
  },
  cents: {
    ...typography.receiptLabel,
    color: colors.onSurfaceVariant,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  targetGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  targetLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  targetValue: {
    ...typography.receiptNumericMd,
    fontFamily: fontFamilies.mono.bold,
    color: colors.onSurface,
  },
  overGoal: {
    ...typography.receiptNumericMd,
    fontFamily: fontFamilies.mono.bold,
    color: colors.error,
  },
  track: {
    height: 14,
    padding: 2,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
  },
  goalFill: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: radii.full,
    borderBottomLeftRadius: radii.full,
  },
  excessFill: {
    backgroundColor: colors.error,
    borderTopRightRadius: radii.full,
    borderBottomRightRadius: radii.full,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md - 4,
    paddingTop: spacing.xs,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
  },
  dotSpaced: {
    marginLeft: spacing.xs,
  },
  legendLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  legendExcess: {
    ...typography.labelSm,
    fontFamily: fontFamilies.inter.semiBold,
    color: colors.error,
  },
  cutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.lg,
    backgroundColor: colors.errorContainer,
  },
  cutBadgeText: {
    ...typography.receiptLabel,
    fontFamily: fontFamilies.mono.bold,
    color: colors.error,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  tipText: {
    ...typography.bodyMd,
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  tipStrong: {
    ...typography.receiptNumericMd,
    fontFamily: fontFamilies.mono.bold,
    color: colors.onSurface,
  },

  // Costliest appliances card
  costliestCard: {
    gap: spacing.md,
  },
  costliestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  costliestTitleGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  meterBadge: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerHigh,
  },
  costliestTitle: {
    ...typography.titleMd,
    flexShrink: 1,
    color: colors.onSurface,
  },
  topCount: {
    ...typography.receiptLabel,
    color: colors.onSurfaceVariant,
  },
  costList: {
    gap: spacing.md,
  },
  costRow: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: `${colors.surfaceContainerLow}99`,
  },
  costRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  costIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  costIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainer,
  },
  costText: {
    flex: 1,
  },
  costNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  costName: {
    ...typography.titleMd,
    flexShrink: 1,
    color: colors.onSurface,
  },
  costSpecs: {
    ...typography.bodyMd,
    fontSize: 13,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  costAmount: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  costValue: {
    ...typography.receiptNumericMd,
    fontFamily: fontFamilies.mono.bold,
    color: colors.onSurface,
  },
  costUnit: {
    ...typography.receiptLabel,
    color: colors.onSurfaceVariant,
  },
  costTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
  },
  costFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  seeAll: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.md,
  },
  seeAllPressed: {
    backgroundColor: colors.surfaceContainer,
  },
  seeAllLabel: {
    ...typography.labelMd,
    color: colors.primary,
  },

  // Energy and carbon cards
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    minHeight: 110,
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level1,
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  metricLabel: {
    ...typography.labelSm,
    flexShrink: 1,
    color: colors.onSurfaceVariant,
  },
  metricIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  metricValue: {
    ...typography.receiptNumericLg,
    color: colors.onSurface,
  },
  metricUnit: {
    ...typography.bodyMd,
    fontSize: 14,
    color: colors.onSurface,
  },
  metricCaption: {
    ...typography.labelSm,
    marginTop: 2,
    color: colors.onSurfaceVariant,
  },

  // Make a plan
  planButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    borderRadius: radii.xl,
    backgroundColor: colors.primaryContainer,
    boxShadow: shadows.level3,
  },
  planButtonPressed: {
    backgroundColor: colors.primary,
  },
  planButtonLabel: {
    ...typography.titleMd,
    color: colors.onPrimary,
  },
});
