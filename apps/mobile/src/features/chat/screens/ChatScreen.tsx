import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  SlideInLeft,
  SlideOutLeft,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@hooks/useTheme';
import { MicOrb, ScreenContainer } from '@components/ui';
import { logger } from '@utils/logger';
import { spacing } from '@theme';
import { useChat } from '../hooks/useChat';
import { useSpeech } from '../hooks/useSpeech';
import { useConversations } from '../hooks/useConversations';
import { useChatStore } from '../stores/chatStore';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInput } from '../components/ChatInput';
import { VoiceOverlay } from '../components/VoiceOverlay';
import { ConversationSidebar } from '../components/ConversationSidebar';
import type { UIMessage } from '../hooks/useChat';

const SUGGESTIONS = [
  { title: 'Plan my day', subtitle: 'around my tasks', prompt: 'Plan my day' },
  { title: 'Add a task', subtitle: 'buy groceries tomorrow', prompt: 'Add a task: buy groceries tomorrow' },
  { title: 'Summarize my notes', subtitle: 'the recent ones', prompt: 'Summarize my notes' },
  { title: 'Brainstorm ideas', subtitle: 'for the weekend', prompt: 'Brainstorm some ideas for the weekend' },
];

/** Above this width the sidebar is pinned; below it, it slides in as a drawer. */
const WIDE_BREAKPOINT = 768;
const SIDEBAR_WIDTH = 300;

export function ChatScreen() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  const [autoSpeak, setAutoSpeak] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Bridges the voice hook (declared first) to sendMessage (from useChat, below),
  // breaking the speak ⇄ sendMessage circular dependency between the two hooks.
  const sendRef = useRef<(text: string) => void>(() => {});

  const {
    speak, cancelSpeech, isSpeaking, isListening, isTranscribing, transcript,
    clearTranscript, startListening, stopListening, speechError,
  } = useSpeech({ onTranscript: (text) => sendRef.current(text) });

  const handleMessageComplete = useCallback(
    (text: string) => { if (autoSpeak) speak(text); },
    [autoSpeak, speak]
  );

  const {
    messages, isConnected, isStreaming, isLoadingHistory, error, newTask,
    conversationId, sendMessage, clearError, clearNewTask,
  } = useChat({
    conversationId: activeConversationId ?? undefined,
    onMessageComplete: handleMessageComplete,
  });

  sendRef.current = sendMessage;

  const { conversations, isLoading: isLoadingConversations, refresh, remove } =
    useConversations();

  // Re-sync the sidebar whenever a stream settles: a first reply both creates
  // the conversation and (server-side) auto-generates its title.
  useEffect(() => {
    if (!isStreaming) refresh();
  }, [isStreaming, conversationId, refresh]);

  const flatListRef = useRef<FlatList<UIMessage>>(null);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length, isStreaming]);

  useEffect(() => {
    if (!newTask) return;
    const t = setTimeout(clearNewTask, 4000);
    return () => clearTimeout(t);
  }, [newTask, clearNewTask]);

  const startVoice = useCallback(() => {
    clearTranscript();
    startListening().catch((e) => logger.error('Failed to start listening', e));
  }, [clearTranscript, startListening]);

  // Stop early. The final transcript arrives asynchronously: the recorded clip
  // is sent to Whisper and delivered via useSpeech's `onTranscript`, which sends
  // the message. (VAD also auto-stops when the user falls silent.)
  const stopVoice = useCallback(() => {
    stopListening().catch((e) => logger.error('Failed to stop listening', e));
  }, [stopListening]);

  const toggleAutoSpeak = useCallback(() => {
    if (autoSpeak) cancelSpeech();
    setAutoSpeak((v) => !v);
  }, [autoSpeak, cancelSpeech]);

  const handleNewChat = useCallback(() => {
    // Explicit reset covers the case where activeConversationId is already
    // null (fresh chat that acquired a server id mid-session) — the prop
    // doesn't change, so useChat's hydrate effect wouldn't re-run.
    useChatStore.getState().reset();
    setActiveConversationId(null);
    setSidebarOpen(false);
  }, []);

  const handleSelectConversation = useCallback(
    (id: string) => {
      if (id !== conversationId) setActiveConversationId(id);
      setSidebarOpen(false);
    },
    [conversationId]
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      remove(id).catch((e) => logger.error('Failed to delete conversation', e));
      if (id === conversationId) handleNewChat();
    },
    [remove, conversationId, handleNewChat]
  );

  const sidebar = (
    <ConversationSidebar
      conversations={conversations}
      activeId={conversationId}
      isLoading={isLoadingConversations}
      onSelect={handleSelectConversation}
      onNewChat={handleNewChat}
      onDelete={handleDeleteConversation}
    />
  );

  return (
    <ScreenContainer>
      <View style={styles.rootRow}>
        {/* ───────── Pinned sidebar (tablet / landscape) ───────── */}
        {isWide && (
          <View style={[styles.pinnedSidebar, { borderRightColor: theme.colors.border }]}>
            {sidebar}
          </View>
        )}

        <View style={styles.flex}>
          {/* ───────── Header: quiet, centered status pill ───────── */}
          <View style={styles.header}>
            <View style={styles.headerSide}>
              {!isWide && (
                <TouchableOpacity
                  style={[styles.ghostBtn, { borderColor: theme.colors.border }]}
                  onPress={() => setSidebarOpen(true)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Open chat history"
                >
                  <Icon name="menu" size={19} color={theme.colors.subtle} />
                </TouchableOpacity>
              )}
            </View>

            <View
              style={[styles.headerPill, { backgroundColor: theme.colors.surface }]}
              accessibilityLabel={
                isConnected ? 'AI Assistant, connected' : 'AI Assistant, connecting'
              }
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isConnected ? theme.colors.success : theme.colors.muted },
                ]}
              />
              <Text style={[theme.textStyles.bodyMedium, { color: theme.colors.heading }]}>
                AI Assistant
              </Text>
              <Icon name="chevron-down" size={13} color={theme.colors.subtle} />
            </View>

            <View style={[styles.headerSide, styles.headerSideRight]}>
              <TouchableOpacity
                style={[styles.ghostBtn, { borderColor: theme.colors.border }]}
                onPress={handleNewChat}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Start a new chat"
              >
                <Icon name="create-outline" size={19} color={theme.colors.subtle} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ───────── Body ───────── */}
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <MessageBubble
                  message={item}
                  animateEntry={index === messages.length - 1}
                />
              )}
              ListEmptyComponent={
                isLoadingHistory ? (
                  <View style={styles.historyLoading}>
                    <ActivityIndicator color={theme.colors.subtle} />
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <View style={styles.greetingBlock}>
                      <MicOrb size={72} />
                      <Text
                        style={[theme.textStyles.display, styles.emptyTitle, { color: theme.colors.heading }]}
                      >
                        Ask me{' '}
                        <Text style={{ color: theme.colors.accentLight }}>anything</Text>
                      </Text>
                      <Text style={[styles.emptySubtitle, { color: theme.colors.subtle }]}>
                        Type below, or hold the mic and just talk.
                      </Text>
                    </View>

                    <View style={styles.suggestionGrid}>
                      {SUGGESTIONS.map((s) => (
                        <TouchableOpacity
                          key={s.title}
                          style={[
                            styles.suggestionCard,
                            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                          ]}
                          onPress={() => sendMessage(s.prompt)}
                          activeOpacity={0.75}
                          accessibilityRole="button"
                          accessibilityLabel={`${s.title}, ${s.subtitle}`}
                        >
                          <Text style={[styles.suggestionTitle, { color: theme.colors.text }]}>
                            {s.title}
                          </Text>
                          <Text style={[styles.suggestionSubtitle, { color: theme.colors.subtle }]}>
                            {s.subtitle}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )
              }
              contentContainerStyle={
                messages.length === 0 ? styles.emptyContainer : styles.listContent
              }
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: false })
              }
            />

            {newTask && (
              <Animated.View
                entering={FadeInUp.springify().damping(16)}
                exiting={FadeOutDown.duration(180)}
              >
                <TouchableOpacity
                  style={[styles.taskToast, { backgroundColor: theme.colors.success }]}
                  onPress={clearNewTask}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss task notification"
                >
                  <Text style={styles.taskToastText}>
                    ✓ Task created: "{newTask.title}"
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {error && (
              <Animated.View
                entering={FadeInUp.springify().damping(16)}
                exiting={FadeOutDown.duration(180)}
                style={[styles.errorBanner, { backgroundColor: theme.colors.error }]}
              >
                <Text style={styles.errorText} onPress={clearError}>
                  {error} — tap to dismiss
                </Text>
              </Animated.View>
            )}

            {speechError && (
              <Animated.View
                entering={FadeInUp.springify().damping(16)}
                exiting={FadeOutDown.duration(180)}
                style={[styles.errorBanner, { backgroundColor: theme.colors.error }]}
              >
                <Text style={styles.errorText} onPress={clearTranscript}>
                  {speechError} — tap to dismiss
                </Text>
              </Animated.View>
            )}

            <ChatInput
              onSend={sendMessage}
              isStreaming={isStreaming}
              disabled={!isConnected}
              transcript={transcript}
              isListening={isListening}
              onVoicePressIn={startVoice}
              onVoicePressOut={stopVoice}
              autoSpeak={autoSpeak}
              isSpeaking={isSpeaking}
              onToggleAutoSpeak={toggleAutoSpeak}
            />
          </KeyboardAvoidingView>
        </View>
      </View>

      {/* ───────── Slide-in history drawer (phones) ───────── */}
      {!isWide && sidebarOpen && (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(180)}
            style={styles.backdrop}
          >
            <Pressable
              style={styles.flex}
              onPress={() => setSidebarOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close chat history"
            />
          </Animated.View>
          <Animated.View
            entering={SlideInLeft.duration(220)}
            exiting={SlideOutLeft.duration(200)}
            style={[
              styles.drawer,
              {
                width: Math.min(320, width * 0.85),
                backgroundColor: theme.colors.bg,
                borderRightColor: theme.colors.border,
              },
            ]}
          >
            {sidebar}
          </Animated.View>
        </View>
      )}

      {/* ───────── Voice Listening Overlay ───────── */}
      {(isListening || isTranscribing) && (
        <VoiceOverlay
          transcript={transcript}
          isListening={isListening}
          isTranscribing={isTranscribing}
          onStop={stopVoice}
          onClear={clearTranscript}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rootRow: { flex: 1, flexDirection: 'row' },

  pinnedSidebar: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: StyleSheet.hairlineWidth,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    minHeight: 52,
  },
  headerSide: { flex: 1, flexDirection: 'row' },
  headerSideRight: { justifyContent: 'flex-end' },
  ghostBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 9999,
    paddingHorizontal: spacing.base,
    paddingVertical: 7,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },

  listContent: { paddingTop: spacing.md, paddingBottom: spacing.sm },
  emptyContainer: { flex: 1 },
  emptyState: { flex: 1, paddingHorizontal: spacing.lg },
  historyLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  greetingBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.base,
  },
  emptyTitle: { fontSize: 30, lineHeight: 36, textAlign: 'center', marginTop: spacing.sm },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },

  suggestionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  suggestionCard: {
    width: '48.5%',
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    gap: 2,
  },
  suggestionTitle: { fontSize: 14, fontWeight: '500', lineHeight: 19 },
  suggestionSubtitle: { fontSize: 13, lineHeight: 18 },

  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
  },

  taskToast: {
    marginHorizontal: spacing.md, marginBottom: 6,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  taskToastText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  errorBanner: {
    marginHorizontal: spacing.md, marginBottom: spacing.sm,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  errorText: { color: '#FFFFFF', fontSize: 13, textAlign: 'center' },
});
