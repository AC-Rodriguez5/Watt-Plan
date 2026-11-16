import { router } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssistantThinking, AssistantUnavailable } from '@/components/chat-assistant-status';
import { ChatComposer } from '@/components/chat-composer';
import { ChatMessageView } from '@/components/chat-message';
import { ChatSummaryStrip } from '@/components/chat-summary-strip';
import { colors, maxContentWidth, radii, spacing, typography } from '@/constants/theme';
import { useAppStore } from '@/store/app-store';
import { formatClock } from '@/utils/format';

export default function PlanChatScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const listRef = useRef<FlatList>(null);
  const [draft, setDraft] = useState('');

  const plan = useAppStore((state) => state.plan);
  const chat = useAppStore((state) => state.chat);
  const appliances = useAppStore((state) => state.appliances);
  const sendChatMessage = useAppStore((state) => state.sendChatMessage);
  const assistantStatus = useAppStore((state) => state.assistantStatus);
  const retryLastMessage = useAppStore((state) => state.retryLastMessage);
  const undoRevision = useAppStore((state) => state.undoRevision);

  const send = () => {
    const text = draft.trim();
    if (text === '') return;
    void sendChatMessage(text);
    setDraft('');
  };

  const lastUserIndex = chat.findLastIndex((message) => message.role === 'user');
  const lastRevisionIndex = chat.findLastIndex((message) => message.role === 'assistant' && message.revision !== undefined);

  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={headerHeight} style={styles.screen}>
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
              onRetry={() => void retryLastMessage()}
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
            onViewFullPlan={() => (router.canGoBack() ? router.back() : router.replace('/plan'))}
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
