import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Polygon, Rect, Stop } from 'react-native-svg';

import { Icon } from '@/components/icon';
import { colors, fontFamilies, radii, shadows, spacing, typography } from '@/constants/theme';
import { formatPeso } from '@/utils/format';

const HERO_PHOTO = require('../../assets/images/home-hero.jpg');

const PREVIEW_APPLIANCES = [
  { label: 'Inverter Fan', icon: 'mode_fan' },
  { label: 'Refrigerator', icon: 'kitchen' },
  { label: '1.5 HP Aircon', icon: 'ac_unit' },
] as const;

const LEADER = '. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .';

type HomeSetupProps = {
  /** Monthly target in pesos, shown on the receipt preview. Null until one is set. */
  target: number | null;
  /** Average kWh per day across the appliances added so far. */
  dailyKwh: number;
  hasAppliances: boolean;
};

/** Home tab before appliances or a last bill exist (design/screens/home_no_setup.png). */
export function HomeSetup({ target, dailyKwh, hasAppliances }: HomeSetupProps) {
  const openPlan = () => router.navigate('/plan');

  return (
    <View style={styles.stack}>
      <View style={styles.statusRow}>
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Setup in 2 quick steps</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Image source={HERO_PHOTO} contentFit="cover" style={StyleSheet.absoluteFill} />
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="heroShade" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={colors.onSurface} stopOpacity={0.85} />
              <Stop offset="0.5" stopColor={colors.onSurface} stopOpacity={0.3} />
              <Stop offset="1" stopColor={colors.onSurface} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroShade)" />
        </Svg>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Take charge of your Meralco bill</Text>
        </View>
      </View>

      <View style={[styles.stepCard, styles.stepCardPrimary]}>
        <StepHeader
          icon={<Icon name="electric_bolt" size={28} color={colors.primaryContainer} />}
          iconBackground={colors.surfaceContainer}
          badge="Step 1"
          badgeBackground={colors.primaryFixed}
          badgeColor={colors.onPrimaryFixed}
          title="Add your appliances"
          body="List what you use every day."
        />
        <View style={styles.previewRow}>
          {PREVIEW_APPLIANCES.map(({ label, icon }) => (
            <View key={label} style={styles.previewChip}>
              <Icon name={icon} size={16} color={colors.secondary} />
              <Text style={styles.previewText}>{label}</Text>
            </View>
          ))}
          <View style={[styles.previewChip, styles.previewMore]}>
            <Text style={[styles.previewText, { color: colors.onSurfaceVariant }]}>+12 more</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add appliances"
          onPress={() => router.navigate('/appliances')}
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}>
          <Icon name="add" size={20} color={colors.onPrimary} />
          <Text style={styles.addButtonLabel}>Add appliances</Text>
        </Pressable>
      </View>

      <View style={[styles.stepCard, styles.stepCardSecondary]}>
        <StepHeader
          icon={<Icon name="receipt_long" size={26} color={colors.secondary} />}
          iconBackground={colors.surfaceContainerHigh}
          badge="Step 2"
          badgeBackground={colors.surfaceContainerHighest}
          badgeColor={colors.onSurfaceVariant}
          title="Add your recent bill"
          body="Copy two numbers from your last bill."
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enter bill"
          onPress={() => router.push('/bill-settings')}
          style={({ pressed }) => [styles.billButton, pressed && styles.billButtonPressed]}>
          <Text style={styles.billButtonLabel}>Enter bill</Text>
        </Pressable>
      </View>

      <View style={styles.receipt}>
        <View style={styles.receiptHeader}>
          <Icon name="receipt" size={18} color={colors.outline} />
          <Text style={styles.receiptTitle}>YOUR PLAN</Text>
        </View>
        <View style={styles.ledger}>
          <LedgerRow label="Target" value={target === null ? '—' : formatPeso(target)} valueStyle={styles.ledgerBold} />
          <LedgerRow label="Daily use" value={`${dailyKwh.toFixed(2)} kWh`} />
        </View>
        <View style={styles.tornEdge}>
          <Svg width="100%" height={12} viewBox="0 0 320 12" preserveAspectRatio="none">
            <Polygon
              fill={colors.surface}
              points="0,0 10,12 20,0 30,12 40,0 50,12 60,0 70,12 80,0 90,12 100,0 110,12 120,0 130,12 140,0 150,12 160,0 170,12 180,0 190,12 200,0 210,12 220,0 230,12 240,0 250,12 260,0 270,12 280,0 290,12 300,0 310,12 320,0"
            />
          </Svg>
        </View>
      </View>

      <View style={styles.generate}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Generate Watt Plan"
          accessibilityState={{ disabled: !hasAppliances }}
          disabled={!hasAppliances}
          onPress={openPlan}
          style={({ pressed }) => [
            styles.generateButton,
            hasAppliances && styles.generateButtonEnabled,
            hasAppliances && pressed && styles.generateButtonPressed,
          ]}>
          <Icon name="auto_fix_high" size={20} color={hasAppliances ? colors.onPrimary : colors.outline} />
          <Text style={[styles.generateLabel, hasAppliances && { color: colors.onPrimary }]}>Generate Watt Plan</Text>
        </Pressable>
        {!hasAppliances && (
          <View style={styles.lockRow}>
            <Icon name="lock" size={14} color={colors.outline} />
            <Text style={styles.lockText}>Add an appliance first</Text>
          </View>
        )}
      </View>
    </View>
  );
}

type StepHeaderProps = {
  icon: ReactNode;
  iconBackground: string;
  badge: string;
  badgeBackground: string;
  badgeColor: string;
  title: string;
  body: string;
};

function StepHeader({ icon, iconBackground, badge, badgeBackground, badgeColor, title, body }: StepHeaderProps) {
  return (
    <View style={styles.stepHeader}>
      <View style={[styles.stepIcon, { backgroundColor: iconBackground }]}>{icon}</View>
      <View style={styles.stepCopy}>
        <View style={styles.stepTitleRow}>
          <View style={[styles.stepBadge, { backgroundColor: badgeBackground }]}>
            <Text style={[styles.stepBadgeText, { color: badgeColor }]}>{badge}</Text>
          </View>
          <Text style={styles.stepTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <Text style={styles.stepBody}>{body}</Text>
      </View>
    </View>
  );
}

function LedgerRow({ label, value, valueStyle }: { label: string; value: string; valueStyle?: object }) {
  return (
    <View style={styles.ledgerRow}>
      <Text style={styles.ledgerLabel}>{label}</Text>
      <Text style={styles.ledgerLeader} numberOfLines={1}>
        {LEADER}
      </Text>
      <Text style={[styles.ledgerValue, valueStyle]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: `${colors.secondaryContainer}66`,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.primaryContainer,
  },
  statusText: {
    ...typography.labelSm,
    color: colors.onSecondaryContainer,
  },

  hero: {
    height: 144,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: radii.lg,
    backgroundColor: colors.inverseSurface,
    boxShadow: shadows.level1,
  },
  heroText: {
    padding: spacing.md,
  },
  heroTitle: {
    ...typography.titleMd,
    color: colors.surfaceContainerLowest,
  },

  stepCard: {
    padding: 20,
    gap: spacing.md,
    borderRadius: radii.lg,
    boxShadow: shadows.level1,
  },
  stepCardPrimary: {
    backgroundColor: colors.surfaceContainerLowest,
  },
  stepCardSecondary: {
    gap: 12,
    backgroundColor: colors.surfaceContainerLow,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  stepIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
  },
  stepCopy: {
    flex: 1,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  stepBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.inter.semiBold,
  },
  stepTitle: {
    ...typography.titleMd,
    flexShrink: 1,
    color: colors.onSurface,
  },
  stepBody: {
    ...typography.labelMd,
    marginTop: 6,
    fontFamily: fontFamilies.inter.regular,
    color: colors.onSurfaceVariant,
  },
  previewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: spacing.xs,
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  previewMore: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  previewText: {
    ...typography.labelSm,
    color: colors.onSurface,
  },
  addButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.primaryContainer,
  },
  addButtonPressed: {
    backgroundColor: colors.primary,
  },
  addButtonLabel: {
    ...typography.titleMd,
    color: colors.onPrimary,
  },
  billButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerHighest,
  },
  billButtonPressed: {
    backgroundColor: colors.surfaceVariant,
  },
  billButtonLabel: {
    ...typography.labelMd,
    color: colors.onSurface,
  },

  receipt: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level1,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: 12,
  },
  receiptTitle: {
    ...typography.receiptLabel,
    flex: 1,
    color: colors.outline,
  },
  ledger: {
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: spacing.xs,
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ledgerLabel: {
    ...typography.receiptNumericMd,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  ledgerLeader: {
    ...typography.receiptNumericMd,
    flex: 1,
    fontSize: 13,
    color: colors.outline,
  },
  ledgerValue: {
    ...typography.receiptNumericMd,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  ledgerBold: {
    fontFamily: fontFamilies.mono.bold,
    color: colors.onSurface,
  },
  tornEdge: {
    height: 12,
    marginTop: 12,
    marginHorizontal: -spacing.md,
  },

  generate: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  generateButton: {
    width: '100%',
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerHigh,
  },
  generateButtonEnabled: {
    backgroundColor: colors.primaryContainer,
  },
  generateButtonPressed: {
    backgroundColor: colors.primary,
  },
  generateLabel: {
    ...typography.titleMd,
    color: colors.outline,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  lockText: {
    ...typography.labelSm,
    color: colors.outline,
  },
});
