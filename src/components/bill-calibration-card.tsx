import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, fontFamilies, radii, shadows, spacing, typography } from '@/constants/theme';
import type { Calibration, MatchQuality } from '@/optimizer/bill-calibration';
import { formatKwh, formatPesoExact } from '@/utils/format';

const LEADER = '. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .';

const MATCH_LABELS: Record<MatchQuality, string> = {
  exact: 'Exact match',
  close: 'Close match',
  rough: 'Rough match',
};

/** Rate and reconciliation card (design/screens/bill_settings.png). Every figure comes from `calibration`. */
export function BillCalibrationCard({ calibration }: { calibration: Calibration }) {
  const { ratePerKwh, rawKwh, matchedBill, isCalibrated, gapKwh, variance, match } = calibration;
  const matchColor = match === 'rough' ? colors.alert : colors.tertiary;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <View style={styles.headerIcon}>
            <Icon name="electric_bolt" size={18} color={colors.onPrimaryContainer} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>CALIBRATION RATE</Text>
            <Text style={styles.subtitle}>Reconciled household multiplier</Text>
          </View>
        </View>
        {isCalibrated && (
          <View style={styles.badge}>
            <Icon name="tune" size={14} color={colors.tertiary} />
            <Text style={styles.badgeText}>Calibrated</Text>
          </View>
        )}
      </View>

      <View style={styles.rateBox}>
        <View>
          <Text style={styles.rateLabel}>Your effective rate</Text>
          <View style={styles.rateValueRow}>
            <Text style={styles.rateValue}>{`₱${ratePerKwh.toFixed(2)}`}</Text>
            <Text style={styles.rateUnit}>/ kWh</Text>
          </View>
        </View>
        {match !== null && variance !== null && (
          <View style={styles.matchColumn}>
            <View style={styles.matchRow}>
              <Icon name="verified" size={16} color={matchColor} />
              <Text style={[styles.matchLabel, { color: matchColor }]}>{MATCH_LABELS[match]}</Text>
            </View>
            <Text style={styles.variance}>{`±${(variance * 100).toFixed(1)}% variance`}</Text>
          </View>
        )}
      </View>

      <View style={styles.ledger}>
        <LedgerRow icon="devices" iconColor={colors.outline} label="Our raw estimate" value={formatKwh(rawKwh)} />
        <LedgerRow
          icon="price_check"
          iconColor={colors.primary}
          label="After matching your bill"
          value={formatPesoExact(matchedBill)}
          valueStyle={styles.valuePrimary}
        />
        <LedgerRow
          icon="difference"
          iconColor={colors.tertiary}
          label="Unaccounted standby load"
          value={gapKwh === null ? '—' : formatKwh(gapKwh)}
          valueStyle={styles.valueGreen}
        />
      </View>
    </View>
  );
}

type LedgerRowProps = {
  icon: 'devices' | 'price_check' | 'difference';
  iconColor: string;
  label: string;
  value: string;
  valueStyle?: object;
};

function LedgerRow({ icon, iconColor, label, value, valueStyle }: LedgerRowProps) {
  return (
    <View style={styles.ledgerRow}>
      <Icon name={icon} size={16} color={iconColor} />
      <Text style={styles.ledgerLabel}>{label}</Text>
      <Text style={styles.leader} numberOfLines={1}>
        {LEADER}
      </Text>
      <Text style={[styles.ledgerValue, valueStyle]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.primaryContainer,
  },
  headerText: {
    flexShrink: 1,
  },
  title: {
    ...typography.labelMd,
    letterSpacing: 0.7,
    color: colors.onSurface,
  },
  subtitle: {
    ...typography.labelSm,
    color: colors.outline,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: `${colors.tertiaryContainer}26`,
  },
  badgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.inter.semiBold,
    color: colors.tertiary,
  },
  rateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  rateLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  rateValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  rateValue: {
    ...typography.receiptNumericLg,
    color: colors.primary,
  },
  rateUnit: {
    ...typography.receiptLabel,
    color: colors.onSurfaceVariant,
  },
  matchColumn: {
    flexShrink: 1,
    alignItems: 'flex-end',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  matchLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.inter.semiBold,
  },
  variance: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  ledger: {
    gap: 10,
    paddingTop: spacing.xs,
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ledgerLabel: {
    ...typography.bodyLg,
    color: colors.onSurfaceVariant,
  },
  leader: {
    ...typography.receiptLabel,
    flex: 1,
    minWidth: 0,
    color: colors.outlineVariant,
  },
  ledgerValue: {
    ...typography.receiptNumericMd,
    color: colors.onSurface,
  },
  valuePrimary: {
    fontFamily: fontFamilies.mono.bold,
    color: colors.primary,
  },
  valueGreen: {
    color: colors.tertiary,
  },
});
