import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AndroidSymbol } from 'expo-symbols';

import { Icon } from '@/components/icon';
import { colors, maxContentWidth, radii, shadows, spacing, typography } from '@/constants/theme';
import type { AssistantStatus } from '@/types/chat';

const SUGGESTIONS: { label: string; icon: AndroidSymbol }[] = [
  { label: 'Keep the aircon', icon: 'mode_fan' },
  { label: 'Cut the TV more', icon: 'tv_off' },
  { label: 'Why is my bill high?', icon: 'help_outline' },
];

type ChatComposerProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  /** 'thinking' locks the input and mutes the chips while the assistant works. */
  status?: AssistantStatus;
  /** Bottom safe-area inset, so the input clears the gesture bar. */
  bottomInset: number;
};

/** Suggestion chips and the message input pinned to the bottom of Plan chat. */
export function ChatComposer({ value, onChangeText, onSend, status = 'ready', bottomInset }: ChatComposerProps) {
  const thinking = status === 'thinking';
  return (
    <View style={[styles.container, { paddingBottom: Math.max(bottomInset, spacing.md) }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.chips}
        pointerEvents={thinking ? 'none' : 'auto'}
        style={[styles.chipScroll, thinking && styles.muted]}>
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
          {!thinking && <Icon name="chat_bubble_outline" size={20} color={colors.outline} />}
          <TextInput
            value={thinking ? '' : value}
            onChangeText={onChangeText}
            onSubmitEditing={onSend}
            editable={!thinking}
            placeholder={thinking ? 'Assistant is preparing your plan...' : "e.g. I can't cut the fan"}
            placeholderTextColor={colors.outline}
            returnKeyType="send"
            autoComplete="off"
            style={[styles.input, thinking && styles.inputDisabled]}
          />
          {thinking && <Icon name="mic" size={20} color={colors.onSurfaceVariant} />}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: thinking }}
          disabled={thinking}
          onPress={onSend}
          style={({ pressed }) => [styles.send, thinking && styles.sendDisabled, pressed && styles.sendPressed]}>
          <Icon name={thinking ? 'arrow_upward' : 'send'} size={24} color={thinking ? colors.outlineVariant : colors.onPrimary} />
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
  muted: {
    opacity: 0.7,
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
  inputDisabled: {
    opacity: 0.75,
  },
  sendDisabled: {
    backgroundColor: colors.surfaceContainerHigh,
    boxShadow: 'none',
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
