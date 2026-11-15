import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChatReceipt } from '@/components/chat-receipt';
import { Icon } from '@/components/icon';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import type { ChatMessage } from '@/types/chat';
import type { Appliance } from '@/types/energy';
import { toChatReceiptProps } from '@/utils/chat-receipt';
import { formatClock } from '@/utils/format';

type ChatMessageViewProps = {
  message: ChatMessage;
  appliances: Appliance[];
  /** User messages only: true for the newest one, which is drawn in the darker blue. */
  isLatestUser: boolean;
  /** User messages only: true once the assistant has replied. */
  isDelivered: boolean;
  /** Assistant messages with a receipt only: false once a newer receipt replaced this one. */
  isCurrentRevision: boolean;
  onUndo: (messageId: string) => void;
  onViewFullPlan: () => void;
};

export function ChatMessageView({
  message,
  appliances,
  isLatestUser,
  isDelivered,
  isCurrentRevision,
  onUndo,
  onViewFullPlan,
}: ChatMessageViewProps) {
  if (message.role === 'user') {
    return <UserMessage text={message.text} sentAt={message.sentAt} isLatest={isLatestUser} isDelivered={isDelivered} />;
  }

  const receipt = message.revision ? toChatReceiptProps(message.revision, appliances) : null;

  if (receipt && !isCurrentRevision) {
    return (
      <View style={styles.earlier}>
        <View style={styles.earlierPill}>
          <Text style={styles.earlierPillText}>EARLIER VERSION</Text>
        </View>
        <ChatReceipt {...receipt} variant="earlier" />
      </View>
    );
  }

  return (
    <View style={styles.assistant}>
      <View style={styles.assistantHeader}>
        <View style={styles.assistantAvatar}>
          <Icon name="bolt" size={14} color={colors.onSecondaryContainer} />
        </View>
        <Text style={styles.assistantName}>Watt Assistant</Text>
      </View>

      <View style={styles.assistantBubble}>
        <Text style={styles.assistantText}>{message.text}</Text>

        {receipt && (
          <>
            <ChatReceipt {...receipt} variant="current" />
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Undo"
                onPress={() => onUndo(message.id)}
                style={({ pressed }) => [styles.undoButton, pressed && styles.undoButtonPressed]}>
                <Icon name="undo" size={18} color={colors.secondary} />
                <Text style={styles.undoLabel}>Undo</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View full plan"
                onPress={onViewFullPlan}
                style={({ pressed }) => [styles.viewButton, pressed && styles.viewButtonPressed]}>
                <Text style={styles.viewLabel}>View full plan</Text>
                <Icon name="arrow_forward" size={18} color={colors.onSecondaryContainer} />
              </Pressable>
            </View>
          </>
        )}
      </View>

      <Text style={styles.time}>{formatClock(message.sentAt)}</Text>
    </View>
  );
}

function UserMessage({
  text,
  sentAt,
  isLatest,
  isDelivered,
}: {
  text: string;
  sentAt: number;
  isLatest: boolean;
  isDelivered: boolean;
}) {
  return (
    <View style={styles.user}>
      <View style={[styles.userBubble, { backgroundColor: isLatest ? colors.primary : colors.primaryContainer }]}>
        <Text style={[styles.userText, { color: isLatest ? colors.onPrimary : colors.onPrimaryContainer }]}>{text}</Text>
      </View>
      <View style={styles.userMeta}>
        <Text style={styles.time}>{formatClock(sentAt)}</Text>
        {isDelivered && <Icon name="done_all" size={14} color={colors.primary} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // User
  user: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    maxWidth: '85%',
    gap: spacing.xs,
  },
  userBubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.xl,
    boxShadow: shadows.level1,
  },
  userText: {
    ...typography.bodyMd,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  time: {
    ...typography.labelSm,
    color: colors.outline,
    paddingHorizontal: spacing.xs,
  },

  // Assistant
  assistant: {
    alignSelf: 'flex-start',
    width: '94%',
    gap: spacing.sm,
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  assistantAvatar: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.secondaryContainer,
  },
  assistantName: {
    ...typography.labelSm,
    fontFamily: typography.labelMd.fontFamily,
    color: colors.secondary,
  },
  assistantBubble: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level2,
  },
  assistantText: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  undoButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
  },
  undoButtonPressed: {
    backgroundColor: colors.surfaceContainer,
  },
  undoLabel: {
    ...typography.labelMd,
    color: colors.secondary,
  },
  viewButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    backgroundColor: colors.secondaryContainer,
    boxShadow: shadows.level1,
  },
  viewButtonPressed: {
    backgroundColor: colors.primaryFixed,
  },
  viewLabel: {
    ...typography.labelMd,
    color: colors.onSecondaryContainer,
  },

  // Earlier receipt
  earlier: {
    alignSelf: 'flex-start',
    width: '92%',
    gap: spacing.sm,
    opacity: 0.65,
  },
  earlierPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerHighest,
  },
  earlierPillText: {
    ...typography.labelSm,
    letterSpacing: 0.8,
    color: colors.onSurfaceVariant,
  },
});
