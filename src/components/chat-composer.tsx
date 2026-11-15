import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AndroidSymbol } from 'expo-symbols';

import { Icon } from '@/components/icon';
import { colors, maxContentWidth, radii, shadows, spacing, typography } from '@/constants/theme';

const SUGGESTIONS: { label: string; icon: AndroidSymbol }[] = [
  { label: 'Keep the aircon', icon: 'mode_fan' },
  { label: 'Cut the TV more', icon: 'tv_off' },
  { label: 'Why is my bill high?', icon: 'help_outline' },
];

type ChatComposerProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  /** Bottom safe-area inset, so the input clears the gesture bar. */
  bottomInset: number;
};

/** Suggestion chips and the message input pinned to the bottom of Plan chat. */
export function ChatComposer({ value, onChangeText, onSend, bottomInset }: ChatComposerProps) {
  return (
    <View style={[styles.container, { paddingBottom: Math.max(bottomInset, spacing.md) }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.chips}
        style={styles.chipScroll}>
        {SUGGESTIONS.map(({ label, icon }) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => onChangeText(label)}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
            <Icon name={icon} size={18} color={colors.secondary} />
            <Text style={styles.chipLabel}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.inputRow}>
        <View style={styles.field}>
          <Icon name="chat_bubble_outline" size={20} color={colors.outline} />
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={onSend}
            placeholder="e.g. I can't cut the fan"
            placeholderTextColor={colors.outline}
            returnKeyType="send"
            autoComplete="off"
            style={styles.input}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          onPress={onSend}
          style={({ pressed }) => [styles.send, pressed && styles.sendPressed]}>
          <Icon name="send" size={24} color={colors.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    backgroundColor: colors.surface,
  },
  chipScroll: {
    flexGrow: 0,
  },
  chips: {
    gap: spacing.sm,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  chip: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
  },
  chipPressed: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  chipLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.xs,
  },
  field: {
    flex: 1,
    minWidth: 0,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level1,
  },
  input: {
    flex: 1,
    height: '100%',
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  send: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.primaryContainer,
    boxShadow: shadows.level3,
  },
  sendPressed: {
    backgroundColor: colors.primary,
  },
});
