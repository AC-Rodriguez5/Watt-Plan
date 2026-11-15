import { router } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const refreshPlan = useAppStore((state) => state.refreshPlan);
  const sendChatMessage = useAppStore((state) => state.sendChatMessage);
  const undoRevision = useAppStore((state) => state.undoRevision);

  // Opened without visiting the Plan tab first: make sure there is a plan to show.
  useEffect(() => {
    if (!useAppStore.getState().plan) refreshPlan();
  }, [refreshPlan]);

  const send = () => {
    const text = draft.trim();
    if (text === '') return;
    sendChatMessage(text);
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

      <ChatComposer value={draft} onChangeText={setDraft} onSend={send} bottomInset={insets.bottom} />
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
