import { router } from 'expo-router';
import type { AndroidSymbol } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import {
  Alert,
  Keyboard,
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
import { effectiveRatePerKwh } from '@/optimizer/appliance-cost';
import { estimateAppliance } from '@/optimizer/optimizer';
import { useAppStore } from '@/store/app-store';
import type { Appliance, ApplianceCategory } from '@/types/energy';
import {
  usageFromForm,
  validateApplianceForm,
  type ApplianceField,
  type ApplianceFormErrors,
  type ApplianceFormValues,
} from '@/utils/appliance-form';
import { applianceIcon } from '@/utils/appliance-icon';
import { addFormValues, searchPresets, type AppliancePreset } from '@/utils/appliance-presets';
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
  luxury: { background: colors.alertContainer, text: colors.onAlertContainer },
};

const CATEGORY_DESCRIPTIONS: Record<ApplianceCategory, { label: string; text: string; icon: AndroidSymbol }> = {
  essential: {
    label: 'Essential:',
    text: ' Must run, like the fridge. Cut last.',
    icon: 'verified_user',
  },
  flexible: {
    label: 'Flexible:',
    text: ' Daily use, like fans. Cut if needed.',
    icon: 'tune',
  },
  luxury: {
    label: 'Luxury:',
    text: ' Comfort, like aircon. Cut first.',
    icon: 'electric_bolt',
  },
};

const EDIT_LUXURY_DESCRIPTION = {
  label: 'Luxury:',
  text: ' Cut first to hit your target.',
};

/** The add sheet asks for an appliance in three short steps. The edit sheet shows everything at once. */
const STEPS: { title: string; fields: ApplianceField[] }[] = [
  { title: 'What is it', fields: ['name', 'watts'] },
  { title: 'How you use it', fields: ['hoursPerDay', 'daysPerWeek'] },
  { title: 'Priority', fields: ['minHoursPerDay'] },
];

/** The errors that belong to one step's fields. */
function errorsFor(errors: ApplianceFormErrors, fields: ApplianceField[]): ApplianceFormErrors {
  return Object.fromEntries(Object.entries(errors).filter(([field]) => fields.includes(field as ApplianceField)));
}

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
  const calibrationFactor = useAppStore((state) => state.calibrationFactor);
  const addAppliance = useAppStore((state) => state.addAppliance);
  const updateAppliance = useAppStore((state) => state.updateAppliance);
  const removeAppliance = useAppStore((state) => state.removeAppliance);

  const [values, setValues] = useState<ApplianceFormValues>(() => initialValues(props));
  const [errors, setErrors] = useState<ApplianceFormErrors>({});
  const [step, setStep] = useState(0);
  const isAdd = mode === 'add';
  const lastStep = STEPS.length - 1;
  /** Hides the sections of other steps in the add sheet; they stay mounted so typed values are kept. */
  const stepStyle = (index: number) => (isAdd && step !== index ? styles.hidden : undefined);
  const suggestions = isAdd ? searchPresets(values.name) : [];

  const showFloor = values.category !== 'luxury';
  const usage = usageFromForm(values);
  // Matched to the bill the same way as the appliance list, so the cost doesn't jump after saving.
  const estimate = usage ? estimateAppliance(usage, billSettings, calibrationFactor) : null;
  const rate = effectiveRatePerKwh(billSettings);
  const kwh = estimate?.kwh ?? null;
  const cost = estimate?.cost ?? null;

  const setField = (field: ApplianceField, text: string) => {
    setValues((current) => ({ ...current, [field]: text }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const close = () => router.back();

  const save = () => {
    const result = validateApplianceForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      // In the add sheet, go back to the first step that has a problem so it is visible.
      const firstBad = STEPS.findIndex(({ fields }) => Object.keys(errorsFor(result.errors, fields)).length > 0);
      if (isAdd && firstBad >= 0 && firstBad !== step) goToStep(firstBad);
      return;
    }
    if (props.mode === 'add') {
      addAppliance(result.value);
    } else {
      updateAppliance(props.appliance.id, result.value);
    }
    close();
  };

  /**
   * Changes the add sheet's step. The keyboard closes first: the field being typed in is about to be
   * hidden, and on Android a hidden field can keep the focus and swallow what is typed next.
   */
  const goToStep = (index: number) => {
    Keyboard.dismiss();
    setStep(index);
  };

  /** Moves to the next step once this step's fields are valid. */
  const next = () => {
    const result = validateApplianceForm(values);
    const stepErrors = result.ok ? {} : errorsFor(result.errors, STEPS[step].fields);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length === 0) goToStep(step + 1);
  };

  const back = () => {
    setErrors({});
    goToStep(step - 1);
  };

  const applyPreset = (preset: AppliancePreset) => {
    setValues(addFormValues(preset));
    setErrors({});
  };

  const remove = () => {
    if (props.mode !== 'edit') return;
    const { appliance } = props;
    Alert.alert(`Delete ${appliance.name}?`, 'It will be removed from your list and your plan.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeAppliance(appliance.id);
          close();
        },
      },
    ]);
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
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={close}
              style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}>
              <Icon name="close" size={24} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          {isAdd && <StepProgress step={step} />}

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
            {/* Step 1: name (with preset suggestions) */}
            <View style={stepStyle(0)}>
              <Field
                label="Appliance name"
                icon={applianceIcon(values.name)}
                value={values.name}
                onChangeText={(text) => setField('name', text)}
                placeholder="Stand Fan"
                maxLength={40}
                error={errors.name}
                autoCapitalize="words"
              />
              {suggestions.length > 0 && (
                <View style={styles.suggestions}>
                  {suggestions.map(({ key, preset }) => (
                    <Pressable
                      key={key}
                      accessibilityRole="button"
                      accessibilityLabel={`Use ${preset.name}`}
                      onPress={() => applyPreset(preset)}
                      style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}>
                      <Icon name={applianceIcon(preset.name)} size={20} color={colors.primary} />
                      <Text style={styles.suggestionName}>{preset.name}</Text>
                      <Text style={styles.suggestionWatts}>{preset.watts} W</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Step 1: watts */}
            <View style={stepStyle(0)}>
              <Field
                label="Power"
                icon={isAdd ? 'bolt' : undefined}
                value={values.watts}
                onChangeText={(text) => setField('watts', text)}
                placeholder="60"
                maxLength={6}
                numeric
                suffix={<Text style={styles.wattsUnit}>W</Text>}
                error={errors.watts}
              />
              {!errors.watts && <Hint text="See the sticker on the back" icon="info" />}
            </View>

            {/* Step 2: hours and days */}
            <View style={stepStyle(1)}>
              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Field
                    label="Hours a day"
                    icon={isAdd ? 'schedule' : undefined}
                    value={values.hoursPerDay}
                    onChangeText={(text) => setField('hoursPerDay', text)}
                    placeholder="8"
                    maxLength={5}
                    numeric
                    suffix={<Text style={styles.unit}>h/day</Text>}
                    error={errors.hoursPerDay}
                    compact
                  />
                </View>
                <View style={styles.rowItem}>
                  <Field
                    label="Days a week"
                    icon={isAdd ? 'calendar_month' : undefined}
                    value={values.daysPerWeek}
                    onChangeText={(text) => setField('daysPerWeek', text)}
                    placeholder="7"
                    maxLength={1}
                    numeric
                    suffix={<Text style={styles.unit}>days</Text>}
                    error={errors.daysPerWeek}
                    compact
                  />
                </View>
              </View>
            </View>

            {/* Step 3: category */}
            <View style={[styles.categoryBlock, stepStyle(2)]}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>Category</Text>
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
                <Icon name={descriptionIcon} size={luxuryEdit ? 20 : 18} color={luxuryEdit ? colors.alert : colors.secondary} />
                <Text style={styles.bannerText}>
                  <Text style={styles.bannerStrong}>{description.label}</Text>
                  {description.text}
                </Text>
              </View>
            </View>

            {/* Lowest hours: essential and flexible only */}
            {showFloor &&
              (mode === 'add' ? (
                <View style={stepStyle(2)}>
                  <Field
                    label="Minimum hours a day"
                    icon="health_and_safety"
                    iconColor={colors.tertiary}
                    value={values.minHoursPerDay}
                    onChangeText={(text) => setField('minHoursPerDay', text)}
                    placeholder="4"
                    maxLength={5}
                    numeric
                    suffix={<Text style={styles.unit}>h/day</Text>}
                    error={errors.minHoursPerDay}
                  />
                  {!errors.minHoursPerDay && (
                    <Hint text="The plan never goes below this." icon="lock" tone="positive" />
                  )}
                </View>
              ) : (
                <View style={styles.floorCard}>
                  <View style={styles.floorTop}>
                    <View style={styles.floorTitles}>
                      <Text style={styles.floorTitle}>Minimum hours a day</Text>
                    </View>
                    <View style={[styles.floorInputBox, errors.minHoursPerDay && styles.floorInputBoxError]}>
                      <TextInput
                        accessibilityLabel="Minimum hours per day"
                        value={values.minHoursPerDay}
                        onChangeText={(text) => setField('minHoursPerDay', text)}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        maxLength={5}
                        placeholderTextColor={colors.outline}
                        selectionColor={colors.primaryContainer}
                        style={styles.floorInput}
                      />
                      <Text style={styles.unit}>h/day</Text>
                    </View>
                  </View>
                  {errors.minHoursPerDay ? (
                    <Text style={styles.errorText}>{errors.minHoursPerDay}</Text>
                  ) : (
                    <Text style={styles.fieldLabel}>
                      The plan never goes below {floorHours} h.
                    </Text>
                  )}
                </View>
              ))}

            {/* Add: live run cost, once the hours are being entered */}
            {isAdd && step > 0 && (
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
            {isAdd ? (
              <View style={styles.actionsAdd}>
                <Pressable
                  accessibilityRole="button"
                  onPress={step === 0 ? close : back}
                  style={({ pressed }) => [styles.textButton, styles.cancelAdd, pressed && styles.textButtonPressed]}>
                  <Text style={styles.textButtonLabel}>{step === 0 ? 'Cancel' : 'Back'}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={step === lastStep ? save : next}
                  style={({ pressed }) => [styles.saveAdd, pressed && styles.savePressed]}>
                  <Icon name={step === lastStep ? 'save' : 'arrow_forward'} size={20} color={colors.onPrimary} />
                  <Text style={styles.saveLabel}>{step === lastStep ? 'Save' : 'Next'}</Text>
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
                    style={({ pressed }) => [styles.secondaryButton, styles.deleteButton, pressed && styles.deletePressed]}>
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
  /** Most characters the field accepts, so a typo can't run past a sane value (e.g. 1 digit for days). */
  maxLength?: number;
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
  maxLength,
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
            maxLength={maxLength}
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

/** Numbered dots joined by a line: done steps show a check, the current one is filled, later ones are pale. */
function StepProgress({ step }: { step: number }) {
  const { title } = STEPS[step];
  return (
    <View
      style={styles.progress}
      accessible
      accessibilityLabel={`Step ${step + 1} of ${STEPS.length}: ${title}`}>
      <View style={styles.progressDots}>
        {STEPS.map((_, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <View key={index} style={[styles.progressItem, index > 0 && styles.progressItemGrow]}>
              {index > 0 && <View style={[styles.progressLine, index <= step && styles.progressLineDone]} />}
              <View style={[styles.progressDot, (done || current) && styles.progressDotActive]}>
                {done ? (
                  <Icon name="check" size={16} color={colors.onPrimary} />
                ) : (
                  <Text style={[styles.progressNumber, current && styles.progressNumberActive]}>{index + 1}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
      <Text style={styles.progressLabel}>
        Step {step + 1} of {STEPS.length} · {title}
      </Text>
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
    marginBottom: spacing.lg,
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

  // Groups sit 24 apart, and the buttons 32 below the last group (24 + their 8 top padding).
  form: {
    gap: spacing.lg,
  },
  hidden: {
    display: 'none',
  },

  // Add: step progress
  progress: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressItemGrow: {
    flex: 1,
  },
  progressLine: {
    flex: 1,
    height: 3,
    marginHorizontal: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  progressLineDone: {
    backgroundColor: colors.primaryContainer,
  },
  progressDot: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  progressDotActive: {
    backgroundColor: colors.primaryContainer,
  },
  progressNumber: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  progressNumberActive: {
    color: colors.onPrimary,
  },
  progressLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },

  // Add: preset suggestions under the name
  suggestions: {
    marginTop: spacing.sm,
    overflow: 'hidden',
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  suggestion: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
  },
  suggestionPressed: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  suggestionName: {
    ...typography.bodyMd,
    flex: 1,
    color: colors.onSurface,
  },
  suggestionWatts: {
    ...typography.receiptLabel,
    color: colors.onSurfaceVariant,
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
    paddingHorizontal: spacing.xs,
  },
  categoryTitle: {
    ...typography.labelMd,
    color: colors.onSurface,
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
    backgroundColor: colors.alertContainer,
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
    paddingTop: spacing.sm,
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
  // Delete is the only red button: red means destructive.
  deleteButton: {
    backgroundColor: `${colors.errorContainer}99`,
  },
  deletePressed: {
    backgroundColor: colors.errorContainer,
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
