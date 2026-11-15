import { router, Stack } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssistantThinking, AssistantUnavailable } from '@/components/chat-assistant-status';
import { ChatComposer } from '@/components/chat-composer';
import { ChatMessageView } from '@/components/chat-message';
import { ChatSummaryStrip } from '@/components/chat-summary-strip';
import { colors, maxContentWidth, radii, spacing, typography } from '@/constants/theme';
import { useAppStore } from '@/store/app-store';
import type { AssistantStatus } from '@/types/chat';
import { formatClock } from '@/utils/format';

/**
 * TESTING ONLY: type one of these into the composer (dev builds) to put the assistant in that
 * state. '/thinking' clears itself after THINKING_TEST_MS because the composer is locked while
 * thinking. Remove once the real AI calls set `assistantStatus`.
 */
const TEST_COMMANDS: Record<string, AssistantStatus> = {
  '/thinking': 'thinking',
  '/offline': 'unavailable',
  '/ready': 'ready',
};
const THINKING_TEST_MS = 5000;

export default function PlanChatScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const listRef = useRef<FlatList>(null);
  const [draft, setDraft] = useState('');

  const plan = useAppStore((state) => state.plan);
  const chat = useAppStore((state) => state.chat);
  const appliances = useAppStore((state) => state.appliances);
  const refreshPlan = useAppStore((state) => state.refreshPlan);
  const sendChatMessage = useAppStore((state) => state.sendChatMessage);
  const assistantStatus = useAppStore((state) => state.assistantStatus);
  const setAssistantStatus = useAppStore((state) => state.setAssistantStatus);
  const undoRevision = useAppStore((state) => state.undoRevision);

  // Opened without visiting the Plan tab first: make sure there is a plan to show.
  useEffect(() => {
    if (!useAppStore.getState().plan) refreshPlan();
  }, [refreshPlan]);

  const send = () => {
    const text = draft.trim();
    if (text === '') return;
    if (__DEV__ && text in TEST_COMMANDS) {
      const status = TEST_COMMANDS[text];
      setAssistantStatus(status);
      if (status === 'thinking') {
        setTimeout(() => {
          if (useAppStore.getState().assistantStatus === 'thinking') useAppStore.getState().setAssistantStatus('ready');
        }, THINKING_TEST_MS);
      }
      setDraft('');
      return;
    }
    sendChatMessage(text);
    setDraft('');
  };

  // TODO: re-run the message that was not delivered once src/ai calls a real model. For now this
  // only dismisses the offline reply.
  const retry = () => setAssistantStatus('ready');

  const lastUserIndex = chat.findLastIndex((message) => message.role === 'user');
  const lastRevisionIndex = chat.findLastIndex((message) => message.role === 'assistant' && message.revision !== undefined);

  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={headerHeight} style={styles.screen}>
      {assistantStatus === 'unavailable' && <Stack.Screen options={{ title: 'Change the Plan (AI Unavailable)' }} />}
      {plan && (
        <View style={styles.strip}>
          <ChatSummaryStrip plan={plan} />
        </View>
      )}

      <FlatList
        ref={listRef}
        data={chat}
        keyExtractor={(message) => message.id}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          chat.length > 0 ? (
            <View style={styles.stamp}>
              <Text style={styles.stampText}>Today · {formatClock(chat[0].sentAt)}</Text>
            </View>
          ) : undefined
        }
        ListFooterComponent={
          assistantStatus === 'thinking' ? (
            <AssistantThinking />
          ) : assistantStatus === 'unavailable' ? (
            <AssistantUnavailable
              sentAt={chat[lastUserIndex]?.sentAt ?? null}
              onRetry={retry}
              onGoToAppliances={() => router.navigate('/appliances')}
            />
          ) : undefined
        }
        renderItem={({ item, index }) => (
          <ChatMessageView
            message={item}
            appliances={appliances}
            isLatestUser={index === lastUserIndex}
            isDelivered={chat[index + 1]?.role === 'assistant'}
            isCurrentRevision={index === lastRevisionIndex}
            onUndo={undoRevision}
            onViewFullPlan={() => router.back()}
          />
        )}
      />

      <ChatComposer
        value={draft}
        onChangeText={setDraft}
        onSend={send}
        status={assistantStatus}
        bottomInset={insets.bottom}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  strip: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
  },
  list: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  stamp: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  stampText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
});
