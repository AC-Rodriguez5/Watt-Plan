import { router } from 'expo-router';
import type { AndroidSymbol } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { colors, fontFamilies, maxContentWidth, radii, shadows, spacing, typography } from '@/constants/theme';
import { effectiveRatePerKwh, monthlyCost, monthlyKwh } from '@/optimizer/appliance-cost';
import { useAppStore } from '@/store/app-store';
import type { Appliance, ApplianceCategory } from '@/types/energy';
import {
  usageFromForm,
  validateApplianceForm,
  type ApplianceField,
  type ApplianceFormErrors,
  type ApplianceFormValues,
} from '@/utils/appliance-form';
import { addFormValues, type AppliancePreset } from '@/utils/appliance-presets';
import { formatKwh, formatPeso, formatRate, formatWhole } from '@/utils/format';

/** In add mode, `preset` pre-fills the form. Mount a fresh sheet (new `key`) per open so state never carries over. */
type ApplianceSheetProps = { mode: 'add'; preset?: AppliancePreset } | { mode: 'edit'; appliance: Appliance };

const CATEGORIES: ApplianceCategory[] = ['essential', 'flexible', 'luxury'];
const CATEGORY_LABELS: Record<ApplianceCategory, string> = {
  essential: 'Essential',
  flexible: 'Flexible',
  luxury: 'Luxury',
};

/** Segment icons differ between the two sheets in the design. */
const SEGMENT_ICONS: Record<'add' | 'edit', Record<ApplianceCategory, AndroidSymbol>> = {
  add: { essential: 'shield', flexible: 'tune', luxury: 'electric_bolt' },
  edit: { essential: 'emergency', flexible: 'tune', luxury: 'hotel_class' },
};

/** Selected-segment colors on the edit sheet. The add sheet uses one dark fill for all three. */
const EDIT_SEGMENT_TONES: Record<ApplianceCategory, { background: string; text: string }> = {
  essential: { background: colors.surfaceContainerHighest, text: colors.onSurface },
  flexible: { background: colors.secondaryContainer, text: colors.onSecondaryContainer },
  luxury: { background: colors.errorContainer, text: colors.onErrorContainer },
};

const CATEGORY_DESCRIPTIONS: Record<ApplianceCategory, { label: string; text: string; icon: AndroidSymbol }> = {
  essential: {
    label: 'Essential:',
    text: ' Critical for daily survival or hygiene. Watt Plan will try never to trim this.',
    icon: 'verified_user',
  },
  flexible: {
    label: 'Flexible:',
    text: ' Routine daily appliances with room for optimization (e.g. iron, fans).',
    icon: 'tune',
  },
  luxury: {
    label: 'Luxury:',
    text: ' High-draw comfort loads (e.g. AC, water heater). Prioritized for cutbacks when exceeding budget.',
    icon: 'electric_bolt',
  },
};

const EDIT_LUXURY_DESCRIPTION = {
  label: 'Luxury appliances',
  text: ' are prioritized for reduction first during bill spikes to keep your monthly electric bill within target.',
};

function initialValues(props: ApplianceSheetProps): ApplianceFormValues {
  if (props.mode === 'add') {
    return addFormValues(props.preset);
  }
  const { appliance } = props;
  return {
    name: appliance.name,
    watts: String(appliance.watts),
    hoursPerDay: String(appliance.hoursPerDay),
    daysPerWeek: String(appliance.daysPerWeek),
    minHoursPerDay: appliance.minHoursPerDay === undefined ? '' : String(appliance.minHoursPerDay),
    category: appliance.category,
  };
}

export function ApplianceSheet(props: ApplianceSheetProps) {
  const { mode } = props;
  const insets = useSafeAreaInsets();

  const billSettings = useAppStore((state) => state.billSettings);
  const addAppliance = useAppStore((state) => state.addAppliance);
  const updateAppliance = useAppStore((state) => state.updateAppliance);
  const removeAppliance = useAppStore((state) => state.removeAppliance);

  const [values, setValues] = useState<ApplianceFormValues>(() => initialValues(props));
  const [errors, setErrors] = useState<ApplianceFormErrors>({});

  const showFloor = values.category !== 'luxury';
  const rate = effectiveRatePerKwh(billSettings);
  const usage = usageFromForm(values);
  const kwh = usage ? monthlyKwh(usage) : null;
  const cost = usage ? monthlyCost(usage, rate) : null;

  const setField = (field: ApplianceField, text: string) => {
    setValues((current) => ({ ...current, [field]: text }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const close = () => router.back();

  const save = () => {
    const result = validateApplianceForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    if (props.mode === 'add') {
      addAppliance(result.value);
    } else {
      updateAppliance(props.appliance.id, result.value);
    }
    close();
  };

  const remove = () => {
    if (props.mode !== 'edit') return;
    removeAppliance(props.appliance.id);
    close();
  };

  const description =
    mode === 'edit' && values.category === 'luxury' ? EDIT_LUXURY_DESCRIPTION : CATEGORY_DESCRIPTIONS[values.category];
  const descriptionIcon: AndroidSymbol =
    mode === 'edit' && values.category === 'luxury' ? 'priority_high' : CATEGORY_DESCRIPTIONS[values.category].icon;
  const luxuryEdit = mode === 'edit' && values.category === 'luxury';

  const floorHours = values.minHoursPerDay.trim() === '' ? '—' : values.minHoursPerDay.trim();

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.root}>
      <View style={styles.grabberArea}>
        <View style={styles.grabber} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.margin + insets.bottom }]}>
        <View style={styles.content}>
          {/* Header */}
          <View style={[styles.header, mode === 'add' ? styles.headerAdd : styles.headerEdit]}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{mode === 'add' ? 'Add appliance' : 'Edit appliance'}</Text>
              {mode === 'add' && (
                <Text style={styles.subtitle}>Enter details to estimate monthly power and budget load</Text>
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={close}
              style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}>
              <Icon name="close" size={24} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          {/* Edit: live monthly cost */}
          {mode === 'edit' && (
            <View style={styles.costBanner}>
              <View style={styles.costBannerText}>
                <Text style={styles.fieldLabel}>Estimated monthly cost</Text>
                <Text style={styles.costBannerRate}>Based on {formatRate(rate)}</Text>
              </View>
              <View style={styles.costBadge}>
                <Icon name="bolt" size={18} color={colors.onPrimary} />
                <Text style={styles.costBadgeText}>{cost === null ? '₱--- / mo' : `${formatPeso(cost)} / mo`}</Text>
              </View>
            </View>
          )}

          <View style={styles.form}>
            {/* Name */}
            <Field
              label="Appliance name"
              icon={mode === 'add' ? 'devices' : 'ac_unit'}
              value={values.name}
              onChangeText={(text) => setField('name', text)}
              placeholder={mode === 'add' ? 'e.g. Stand Fan, Microwave' : 'e.g. Rice Cooker, Refrigerator'}
              error={errors.name}
              autoCapitalize="words"
            />

            {/* Watts */}
            <View>
              <Field
                label={mode === 'add' ? 'Power consumption' : 'Power rating'}
                icon={mode === 'add' ? 'bolt' : undefined}
                value={values.watts}
                onChangeText={(text) => setField('watts', text)}
                placeholder="e.g. 60"
                numeric
                suffix={
                  mode === 'add' ? (
                    <View style={styles.wattsPill}>
                      <Text style={styles.wattsPillText}>Watts (W)</Text>
                    </View>
                  ) : (
                    <Text style={styles.wattsUnit}>W</Text>
                  )
                }
                error={errors.watts}
              />
              {!errors.watts && (
                <Hint
                  text={
                    mode === 'add'
                      ? 'Check the manufacturer sticker label on the back or bottom'
                      : 'Check the energy sticker or back label'
                  }
                  icon="info"
                />
              )}
            </View>

            {/* Hours and days */}
            <View>
              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Field
                    label={mode === 'add' ? 'Hours / day' : 'Usage per day'}
                    icon={mode === 'add' ? 'schedule' : undefined}
                    value={values.hoursPerDay}
                    onChangeText={(text) => setField('hoursPerDay', text)}
                    placeholder="e.g. 10"
                    numeric
                    suffix={mode === 'edit' ? <Text style={styles.unit}>h / day</Text> : undefined}
                    error={errors.hoursPerDay}
                    compact
                  />
                  {mode === 'edit' && !errors.hoursPerDay && <Hint text="Daily runtime" />}
                </View>
                <View style={styles.rowItem}>
                  <Field
                    label={mode === 'add' ? 'Days / week' : 'Days per week'}
                    icon={mode === 'add' ? 'calendar_month' : undefined}
                    value={values.daysPerWeek}
                    onChangeText={(text) => setField('daysPerWeek', text)}
                    numeric
                    suffix={mode === 'edit' ? <Text style={styles.unit}>days</Text> : undefined}
                    error={errors.daysPerWeek}
                    compact
                  />
                  {mode === 'edit' && !errors.daysPerWeek && (
                    <Hint text={`Usually ${values.daysPerWeek.trim() || '7'} days`} />
                  )}
                </View>
              </View>
              {mode === 'add' && <Hint text="Days per week active (1 to 7)" />}
            </View>

            {/* Category */}
            <View style={styles.categoryBlock}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{mode === 'add' ? 'Appliance category' : 'Household priority tier'}</Text>
                <Text style={mode === 'add' ? styles.categoryAside : styles.categoryAsideEdit}>
                  {mode === 'add' ? 'Budget priority' : 'Watt Plan optimizer'}
                </Text>
              </View>

              <View
                accessibilityRole="radiogroup"
                accessibilityLabel={mode === 'add' ? 'Appliance priority tier' : 'Appliance priority classification'}
                style={[styles.segments, mode === 'add' ? styles.segmentsAdd : styles.segmentsEdit]}>
                {CATEGORIES.map((category) => {
                  const selected = values.category === category;
                  const selectedStyle =
                    mode === 'add'
                      ? { backgroundColor: colors.inverseSurface }
                      : { backgroundColor: EDIT_SEGMENT_TONES[category].background };
                  const textColor = selected
                    ? mode === 'add'
                      ? colors.inverseOnSurface
                      : EDIT_SEGMENT_TONES[category].text
                    : colors.onSurfaceVariant;
                  return (
                    <Pressable
                      key={category}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      onPress={() => {
                        setValues((current) => ({ ...current, category }));
                        setErrors((current) => ({ ...current, minHoursPerDay: undefined }));
                      }}
                      style={[
                        styles.segment,
                        mode === 'add' ? styles.segmentAdd : styles.segmentEdit,
                        selected && selectedStyle,
                        selected && styles.segmentSelected,
                      ]}>
                      <Icon name={SEGMENT_ICONS[mode][category]} size={18} color={textColor} />
                      <Text style={[styles.segmentLabel, { color: textColor }]}>{CATEGORY_LABELS[category]}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={[styles.banner, luxuryEdit && styles.bannerLuxury]}>
                <Icon name={descriptionIcon} size={luxuryEdit ? 20 : 18} color={luxuryEdit ? colors.error : colors.secondary} />
                <Text style={styles.bannerText}>
                  <Text style={styles.bannerStrong}>{description.label}</Text>
                  {description.text}
                </Text>
              </View>
            </View>

            {/* Lowest hours: essential and flexible only */}
            {showFloor &&
              (mode === 'add' ? (
                <View>
                  <Field
                    label="Lowest hours per day you can live with"
                    icon="health_and_safety"
                    iconColor={colors.tertiary}
                    value={values.minHoursPerDay}
                    onChangeText={(text) => setField('minHoursPerDay', text)}
                    placeholder="e.g. 6"
                    numeric
                    suffix={<Text style={styles.floorUnit}>hrs/day</Text>}
                    error={errors.minHoursPerDay}
                  />
                  {!errors.minHoursPerDay && (
                    <Hint
                      text="Safety buffer: Plan will never reduce this appliance below these hours."
                      icon="lock"
                      tone="positive"
                    />
                  )}
                </View>
              ) : (
                <View style={styles.floorCard}>
                  <View style={styles.floorTop}>
                    <View style={styles.floorTitles}>
                      <Text style={styles.floorTitle}>Emergency budget floor</Text>
                      <Text style={styles.fieldLabel}>Min. hours you can accept</Text>
                    </View>
                    <View style={[styles.floorInputBox, errors.minHoursPerDay && styles.floorInputBoxError]}>
                      <TextInput
                        accessibilityLabel="Minimum hours per day"
                        value={values.minHoursPerDay}
                        onChangeText={(text) => setField('minHoursPerDay', text)}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={colors.outline}
                        selectionColor={colors.primaryContainer}
                        style={styles.floorInput}
                      />
                      <Text style={styles.unit}>h / day</Text>
                    </View>
                  </View>
                  {errors.minHoursPerDay ? (
                    <Text style={styles.errorText}>{errors.minHoursPerDay}</Text>
                  ) : (
                    <Text style={styles.fieldLabel}>
                      When automatic bill trimming runs, Watt Plan will never suggest cutting{' '}
                      {values.name.trim() || 'this appliance'} below {floorHours} hours.
                    </Text>
                  )}
                </View>
              ))}

            {/* Add: live run cost */}
            {mode === 'add' && (
              <View style={styles.runCost}>
                <View style={styles.runCostTop}>
                  <Text style={styles.runCostLabel}>ESTIMATED RUN COST</Text>
                  <Text style={styles.runCostRate}>@ {formatRate(rate)}</Text>
                </View>
                <View style={styles.runCostBottom}>
                  <View style={styles.runCostAmount}>
                    <Text style={styles.runCostPeso}>₱</Text>
                    <Text style={styles.runCostValue}>{cost === null ? '---' : formatWhole(cost)}</Text>
                    <Text style={styles.runCostUnit}>/ month</Text>
                  </View>
                  <View style={styles.kwhPill}>
                    <Icon name="insights" size={14} color={colors.onSurfaceVariant} />
                    <Text style={styles.kwhText}>{kwh === null ? '0 kWh' : formatKwh(kwh)}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Buttons */}
            {mode === 'add' ? (
              <View style={styles.actionsAdd}>
                <Pressable
                  accessibilityRole="button"
                  onPress={close}
                  style={({ pressed }) => [styles.textButton, styles.cancelAdd, pressed && styles.textButtonPressed]}>
                  <Text style={styles.textButtonLabel}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={save}
                  style={({ pressed }) => [styles.saveAdd, pressed && styles.savePressed]}>
                  <Icon name="save" size={20} color={colors.onPrimary} />
                  <Text style={styles.saveLabel}>Save</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.actionsEdit}>
                <Pressable
                  accessibilityRole="button"
                  onPress={save}
                  style={({ pressed }) => [styles.saveEdit, pressed && styles.savePressed]}>
                  <Icon name="check" size={20} color={colors.onPrimary} />
                  <Text style={styles.saveLabel}>Save changes</Text>
                </Pressable>
                <View style={styles.secondaryRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={remove}
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.deletePressed]}>
                    <Icon name="delete" size={20} color={colors.error} />
                    <Text style={[styles.textButtonLabel, { color: colors.error }]}>Delete</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={close}
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.textButtonPressed]}>
                    <Text style={styles.textButtonLabel}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  icon?: AndroidSymbol;
  iconColor?: string;
  placeholder?: string;
  /** Numbers render in the mono face and open the decimal keypad. */
  numeric?: boolean;
  suffix?: ReactNode;
  error?: string;
  /** Tighter horizontal padding, for the two-column row. */
  compact?: boolean;
  autoCapitalize?: 'none' | 'words';
};

/** M3-style tonal text field: label on top, value below, optional icon and suffix. */
function Field({
  label,
  value,
  onChangeText,
  icon,
  iconColor = colors.onSurfaceVariant,
  placeholder,
  numeric,
  suffix,
  error,
  compact,
  autoCapitalize,
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  const keyboardType: KeyboardTypeOptions = numeric ? 'decimal-pad' : 'default';

  return (
    <View>
      <View
        style={[
          styles.field,
          compact && styles.fieldCompact,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
        ]}>
        <Text style={[styles.fieldLabel, focused && styles.fieldLabelFocused]} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.fieldInputRow}>
          {icon && <Icon name={icon} size={compact ? 18 : 20} color={iconColor} />}
          <TextInput
            accessibilityLabel={label}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
            placeholder={placeholder}
            placeholderTextColor={colors.outline}
            selectionColor={colors.primaryContainer}
            style={[styles.input, numeric ? styles.inputNumeric : styles.inputText]}
          />
          {suffix}
        </View>
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

function Hint({ text, icon, tone }: { text: string; icon?: AndroidSymbol; tone?: 'positive' }) {
  const color = tone === 'positive' ? colors.tertiary : colors.onSurfaceVariant;
  return (
    <View style={styles.hint}>
      {icon && <Icon name={icon} size={14} color={color} />}
      <Text style={[styles.hintText, { color }]}>{text}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
  },
  grabberArea: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: spacing.sm,
  },
  grabber: {
    width: 32,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.outlineVariant,
  },
  scrollContent: {
    paddingHorizontal: spacing.margin,
  },
  content: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerAdd: {
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerEdit: {
    alignItems: 'center',
    paddingTop: spacing.xs,
    paddingBottom: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  subtitle: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  closeButton: {
    width: 48,
    height: 48,
    marginRight: -8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  closeButtonPressed: {
    backgroundColor: colors.surfaceContainerHigh,
  },

  // Edit cost banner
  costBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    marginBottom: 20,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  costBannerText: {
    flex: 1,
  },
  costBannerRate: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  costBadge: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.primaryContainer,
    boxShadow: shadows.level1,
  },
  costBadgeText: {
    ...typography.receiptNumericMd,
    color: colors.onPrimary,
    flexShrink: 1,
  },

  form: {
    gap: 20,
  },

  // Fields
  field: {
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceContainerLow,
  },
  fieldCompact: {
    paddingHorizontal: 14,
  },
  fieldFocused: {
    borderColor: colors.primaryContainer,
    backgroundColor: colors.surfaceContainerLowest,
  },
  fieldError: {
    borderColor: colors.alert,
  },
  fieldLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  fieldLabelFocused: {
    color: colors.primary,
  },
  fieldInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 32,
    paddingVertical: 0,
    color: colors.onSurface,
  },
  inputText: {
    ...typography.bodyMd,
  },
  inputNumeric: {
    ...typography.receiptNumericMd,
  },
  errorText: {
    ...typography.labelSm,
    color: colors.error,
    marginTop: 6,
    paddingHorizontal: spacing.xs,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 6,
    paddingHorizontal: spacing.xs,
  },
  hintText: {
    ...typography.labelSm,
    flexShrink: 1,
  },
  wattsPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainer,
  },
  wattsPillText: {
    ...typography.receiptLabel,
    color: colors.onSurfaceVariant,
  },
  wattsUnit: {
    ...typography.receiptNumericMd,
    fontFamily: fontFamilies.mono.bold,
    color: colors.onSurfaceVariant,
    paddingHorizontal: spacing.xs,
  },
  unit: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  floorUnit: {
    ...typography.receiptLabel,
    color: colors.onSurfaceVariant,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
    minWidth: 0,
  },

  // Category
  categoryBlock: {
    gap: spacing.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  categoryTitle: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  categoryAside: {
    ...typography.receiptLabel,
    color: colors.secondary,
  },
  categoryAsideEdit: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  segments: {
    flexDirection: 'row',
    padding: spacing.xs,
    gap: spacing.xs,
    backgroundColor: colors.surfaceContainer,
  },
  segmentsAdd: {
    borderRadius: radii.full,
  },
  segmentsEdit: {
    borderRadius: radii.lg,
  },
  segment: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
  },
  segmentAdd: {
    borderRadius: radii.full,
  },
  segmentEdit: {
    borderRadius: radii.md,
  },
  segmentSelected: {
    boxShadow: shadows.level1,
  },
  segmentLabel: {
    ...typography.labelMd,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  bannerLuxury: {
    backgroundColor: `${colors.errorContainer}4d`,
  },
  bannerText: {
    ...typography.labelSm,
    flex: 1,
    color: colors.onSurfaceVariant,
  },
  bannerStrong: {
    fontFamily: fontFamilies.inter.semiBold,
    color: colors.onSurface,
  },

  // Edit: floor card
  floorCard: {
    gap: spacing.sm,
    padding: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  floorTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  floorTitles: {
    flex: 1,
  },
  floorTitle: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  floorInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceContainer,
  },
  floorInputBoxError: {
    borderColor: colors.alert,
  },
  floorInput: {
    ...typography.receiptNumericMd,
    minWidth: 32,
    paddingVertical: 0,
    textAlign: 'center',
    color: colors.onSurface,
  },

  // Add: run cost
  runCost: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level1,
  },
  runCostTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  runCostLabel: {
    ...typography.receiptLabel,
    color: colors.outline,
  },
  runCostRate: {
    ...typography.receiptLabel,
    color: colors.secondary,
  },
  runCostBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  runCostAmount: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  runCostPeso: {
    ...typography.titleLg,
    color: colors.primary,
  },
  runCostValue: {
    ...typography.receiptNumericLg,
    color: colors.primary,
  },
  runCostUnit: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginLeft: spacing.xs,
  },
  kwhPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
  },
  kwhText: {
    ...typography.receiptNumericMd,
    color: colors.onSurfaceVariant,
  },

  // Buttons
  actionsAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  actionsEdit: {
    gap: 10,
    paddingTop: 12,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  textButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  cancelAdd: {
    minWidth: 80,
    paddingHorizontal: spacing.lg,
  },
  textButtonPressed: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  textButtonLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
  },
  deletePressed: {
    backgroundColor: `${colors.errorContainer}66`,
  },
  saveAdd: {
    height: 48,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
    backgroundColor: colors.primaryContainer,
    boxShadow: shadows.level3,
  },
  saveEdit: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    backgroundColor: colors.primaryContainer,
    boxShadow: shadows.level1,
  },
  savePressed: {
    backgroundColor: colors.primary,
  },
  saveLabel: {
    ...typography.labelMd,
    color: colors.onPrimary,
  },
});
