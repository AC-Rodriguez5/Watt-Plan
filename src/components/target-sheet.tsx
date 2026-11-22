import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BillInputCard } from '@/components/bill-input-card';
import { Icon } from '@/components/icon';
import { colors, maxContentWidth, radii, shadows, spacing, typography, themedStyles } from '@/constants/theme';
import { useAppStore } from '@/store/app-store';
import { tidyAmount } from '@/utils/bill-form';
import { formatAmount } from '@/utils/format';
import { validateTarget } from '@/utils/target-form';

/** Bottom sheet that edits the monthly budget target. Saving recomputes the shared plan. */
export function TargetSheet() {
  const insets = useSafeAreaInsets();
  const target = useAppStore((state) => state.target);
  const setTarget = useAppStore((state) => state.setTarget);

  const [text, setText] = useState(() => (target === null ? '' : formatAmount(target)));
  const [error, setError] = useState<string | undefined>();

  const save = () => {
    const result = validateTarget(text);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTarget(result.value);
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.root}>
      <View style={styles.grabberArea}>
        <View style={styles.grabber} />
      </View>

      <View style={[styles.content, { paddingBottom: spacing.margin + insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Monthly budget target</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}>
            <Icon name="close" size={24} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>

        <BillInputCard
          label="Monthly budget target"
          value={text}
          onChangeText={(next) => {
            setText(next);
            setError(undefined);
          }}
          onBlur={() => setText(tidyAmount(text))}
          prefix="₱"
          placeholder="0.00"
          maxLength={12}
          helper="Pesos per month"
          error={error}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save target"
          onPress={save}
          style={({ pressed }) => [styles.save, pressed && styles.savePressed]}>
          <Icon name="check" size={20} color={colors.onPrimary} />
          <Text style={styles.saveLabel}>Save changes</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = themedStyles(() => ({
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
  content: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.margin,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    ...typography.headlineSm,
    flex: 1,
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
  // 24 gap + 8 = 32 above the button, so it reads as separate from the field.
  save: {
    marginTop: spacing.sm,
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
}));
