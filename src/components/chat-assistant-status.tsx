import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, fontFamilies, radii, shadows, spacing, typography } from '@/constants/theme';
import { formatClock } from '@/utils/format';

/** Loops a 0 to 1 value forever, starting `delay` ms in. */
function useLoop(duration: number, delay = 0) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [value, duration, delay]);
  return value;
}

function TypingDot({ delay }: { delay: number }) {
  const progress = useLoop(350, delay);
  return (
    <Animated.View
      style={[
        styles.dot,
        { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] },
      ]}
    />
  );
}

function SkeletonBar({ width, delay }: { width: `${number}%`; delay: number }) {
  const progress = useLoop(700, delay);
  return (
    <Animated.View
      style={[styles.skeleton, { width, opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }]}
    />
  );
}

/** Assistant reply shown while it works on a new plan (design/screens/plan_chat_loading.png). */
export function AssistantThinking() {
  return (
    <View style={styles.assistant}>
      <View style={styles.header}>
        <View style={styles.thinkingAvatar}>
          <Icon name="bolt" size={16} color={colors.primary} />
        </View>
        <Text style={styles.name}>Watt Assistant</Text>
        <View style={styles.thinkingPill}>
          <View style={styles.pillDot} />
          <Text style={styles.thinkingText}>THINKING...</Text>
        </View>
      </View>

      <View style={styles.thinkingBubble} accessibilityLabel="Assistant is thinking" accessibilityLiveRegion="polite">
        <View style={styles.dots}>
          <TypingDot delay={0} />
          <TypingDot delay={150} />
          <TypingDot delay={300} />
        </View>
        <Text style={styles.thinkingCopy}>Adjusting the schedule cuts to hold your target…</Text>
        <View style={styles.skeletons}>
          <SkeletonBar width="80%" delay={0} />
          <SkeletonBar width="60%" delay={150} />
        </View>
      </View>
    </View>
  );
}

type AssistantUnavailableProps = {
  /** When the message that was not delivered was sent. Null when there is none to point at. */
  sentAt: number | null;
  onRetry: () => void;
  onGoToAppliances: () => void;
};

/** Assistant reply shown when the AI cannot be reached (design/screens/plan_chat_unavailable.png). */
export function AssistantUnavailable({ sentAt, onRetry, onGoToAppliances }: AssistantUnavailableProps) {
  return (
    <View style={styles.assistant}>
      <View style={styles.header}>
        <View style={styles.offlineAvatar}>
          <Icon name="cloud_off" size={14} color={colors.onErrorContainer} />
        </View>
        <Text style={styles.offlineName}>Watt Assistant</Text>
        <View style={styles.offlinePill}>
          <Text style={styles.offlineText}>OFFLINE</Text>
        </View>
      </View>

      <View style={styles.offlineBubble}>
        <View style={styles.offlineMessage}>
          <Icon name="error" size={22} color={colors.error} />
          <Text style={styles.offlineCopy}>
            Can&apos;t reach the assistant right now. You can still edit hours on the Appliances tab.
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try again"
            onPress={onRetry}
            style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}>
            <Icon name="refresh" size={18} color={colors.onPrimary} />
            <Text style={styles.retryLabel}>Try again</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to Appliances"
            onPress={onGoToAppliances}
            style={({ pressed }) => [styles.appliances, pressed && styles.appliancesPressed]}>
            <Text style={styles.appliancesLabel}>Go to Appliances</Text>
            <Icon name="arrow_forward" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <Text style={styles.status}>{sentAt === null ? 'Not delivered' : `${formatClock(sentAt)} · Not delivered`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  assistant: {
    alignSelf: 'flex-start',
    width: '94%',
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  // Thinking
  thinkingAvatar: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.primaryFixed,
    boxShadow: shadows.level1,
  },
  name: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  thinkingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: `${colors.secondaryFixed}80`,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  thinkingText: {
    fontFamily: fontFamilies.mono.bold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1,
    color: colors.primary,
  },
  thinkingBubble: {
    padding: spacing.md,
    borderRadius: radii.xl,
    borderTopLeftRadius: radii.sm,
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level1,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingTop: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  thinkingCopy: {
    ...typography.labelSm,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
  skeletons: {
    gap: spacing.sm,
    marginTop: 14,
    paddingTop: 12,
    opacity: 0.6,
  },
  skeleton: {
    height: 12,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerHigh,
  },

  // Unavailable
  offlineAvatar: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.errorContainer,
  },
  offlineName: {
    ...typography.labelSm,
    fontFamily: fontFamilies.inter.semiBold,
    color: colors.onSurfaceVariant,
  },
  offlinePill: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
    backgroundColor: colors.errorContainer,
  },
  offlineText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.inter.bold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1,
    color: colors.onErrorContainer,
  },
  offlineBubble: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.error}4D`,
    borderRadius: radii.xl,
    backgroundColor: `${colors.errorContainer}4D`,
    boxShadow: shadows.level1,
  },
  offlineMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  offlineCopy: {
    ...typography.bodyMd,
    flex: 1,
    color: colors.onSurface,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  retry: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    boxShadow: shadows.level1,
  },
  retryPressed: {
    backgroundColor: colors.primaryContainer,
  },
  retryLabel: {
    ...typography.labelMd,
    color: colors.onPrimary,
  },
  appliances: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
  },
  appliancesPressed: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  appliancesLabel: {
    ...typography.labelMd,
    color: colors.primary,
  },
  status: {
    ...typography.labelSm,
    paddingHorizontal: spacing.xs,
    color: colors.outline,
  },
});
