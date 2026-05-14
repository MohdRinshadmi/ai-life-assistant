import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';
import { useChat } from '../hooks/useChat';
import { useSpeech } from '../hooks/useSpeech';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInput } from '../components/ChatInput';
import type { UIMessage } from '../hooks/useChat';

export function ChatScreen() {
  const { theme } = useTheme();
  const [autoSpeak, setAutoSpeak] = useState(false);

  const { speak, cancelSpeech, isSpeaking, isListening, transcript, clearTranscript, startListening, stopListening } = useSpeech();

  const handleMessageComplete = useCallback(
    (text: string) => {
      if (autoSpeak) speak(text);
    },
    [autoSpeak, speak]
  );

  const {
    messages,
    isConnected,
    isStreaming,
    error,
    newTask,
    sendMessage,
    clearError,
    clearNewTask,
  } = useChat({ onMessageComplete: handleMessageComplete });

  const flatListRef = useRef<FlatList<UIMessage>>(null);

  // Auto-scroll to bottom on new message or streaming token update
  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length, isStreaming]);

  // Auto-dismiss task toast after 4 seconds
  useEffect(() => {
    if (!newTask) return;
    const timer = setTimeout(clearNewTask, 4000);
    return () => clearTimeout(timer);
  }, [newTask, clearNewTask]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.bg }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[theme.textStyles.h3, { color: theme.colors.heading }]}>
          AI Chat
        </Text>
        <View style={styles.headerRight}>
          {/* Auto-speak toggle */}
          <TouchableOpacity
            style={[
              styles.speakToggle,
              {
                backgroundColor: autoSpeak ? theme.colors.primary : theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => {
              if (autoSpeak) cancelSpeech();
              setAutoSpeak((v) => !v);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.speakToggleText, { color: autoSpeak ? '#FFFFFF' : theme.colors.subtle }]}>
              {isSpeaking ? '🔊' : '🔇'}
            </Text>
          </TouchableOpacity>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isConnected ? theme.colors.success : theme.colors.muted },
              ]}
            />
            <Text style={[styles.statusText, { color: theme.colors.subtle }]}>
              {isConnected ? 'Connected' : 'Connecting...'}
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: theme.colors.heading }]}>
                AI Life Assistant
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.subtle }]}>
                Ask me anything — tasks, goals, plans, or just a chat.
              </Text>
            </View>
          }
          contentContainerStyle={
            messages.length === 0 ? styles.emptyContainer : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />

        {/* Task auto-created toast */}
        {newTask && (
          <TouchableOpacity
            style={[styles.taskToast, { backgroundColor: theme.colors.success }]}
            onPress={clearNewTask}
            activeOpacity={0.85}
          >
            <Text style={styles.taskToastText}>
              ✓ Task created: "{newTask.title}"
            </Text>
          </TouchableOpacity>
        )}

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: theme.colors.error }]}>
            <Text style={styles.errorText} onPress={clearError}>
              {error} — tap to dismiss
            </Text>
          </View>
        )}

        <ChatInput
          onSend={sendMessage}
          isStreaming={isStreaming}
          disabled={!isConnected}
          transcript={transcript}
          isListening={isListening}
          onVoicePressIn={() => {
            clearTranscript();
            void startListening();
          }}
          onVoicePressOut={() => void stopListening()}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  speakToggle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakToggleText: { fontSize: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12 },
  listContent: { paddingTop: 12, paddingBottom: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  taskToast: {
    marginHorizontal: 12,
    marginBottom: 6,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  taskToastText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  errorBanner: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: { color: '#FFFFFF', fontSize: 13, textAlign: 'center' },
});
