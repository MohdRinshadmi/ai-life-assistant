import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '@hooks/useTheme';
import { useChat } from '../hooks/useChat';
import { useSpeech } from '../hooks/useSpeech';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInput } from '../components/ChatInput';
import { MicOrb } from '@components/ui/MicOrb';
import { NeonEdgeFrame } from '@components/ui/NeonEdgeFrame';
import type { UIMessage } from '../hooks/useChat';

export function ChatScreen() {
  const { theme } = useTheme();
  const [autoSpeak, setAutoSpeak] = useState(false);

  const {
    speak, cancelSpeech, isSpeaking, isListening, transcript,
    clearTranscript, startListening, stopListening,
  } = useSpeech();

  const handleMessageComplete = useCallback(
    (text: string) => { if (autoSpeak) speak(text); },
    [autoSpeak, speak]
  );

  const {
    messages, isConnected, isStreaming, error, newTask,
    sendMessage, clearError, clearNewTask,
  } = useChat({ onMessageComplete: handleMessageComplete });

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
    void startListening();
  }, [clearTranscript, startListening]);

  const stopVoiceAndSend = useCallback(() => {
    void stopListening();
    if (transcript.trim()) {
      sendMessage(transcript.trim());
    }
    clearTranscript();
  }, [stopListening, transcript, sendMessage, clearTranscript]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={theme.colors.gradients.backdrop as unknown as string[]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* ───────── Header ───────── */}
        <View style={styles.header}>
          <Text style={[theme.textStyles.h3, { color: theme.colors.heading }]}>AI Chat</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[
                styles.iconBtn,
                {
                  backgroundColor: autoSpeak ? theme.colors.primary : 'rgba(255,255,255,0.04)',
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => { if (autoSpeak) cancelSpeech(); setAutoSpeak((v) => !v); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.iconBtnText, { color: autoSpeak ? '#FFFFFF' : theme.colors.subtle }]}>
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

        {/* ───────── Body ───────── */}
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                  Ask me anything — or hold the mic to talk.
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
            onVoicePressIn={startVoice}
            onVoicePressOut={() => void stopListening()}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ───────── Voice Listening Overlay ───────── */}
      {isListening && (
        <View style={StyleSheet.absoluteFill}>
          <NeonEdgeFrame thickness={2.5} radius={36}>
            <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
              {/* top bar with back / new */}
              <View style={styles.overlayTop}>
                <TouchableOpacity
                  style={styles.overlayCircleBtn}
                  onPress={() => void stopListening()}
                  activeOpacity={0.7}
                >
                  <Text style={styles.overlayBackArrow}>‹</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.overlayCircleBtn}
                  onPress={clearTranscript}
                  activeOpacity={0.7}
                >
                  <Text style={styles.overlayPlus}>+</Text>
                </TouchableOpacity>
              </View>

              {/* live transcript */}
              <ScrollView
                style={styles.overlayScroll}
                contentContainerStyle={styles.overlayScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.overlayTranscript}>
                  {transcript || 'Listening for your voice…'}
                </Text>
              </ScrollView>

              {/* footer: status + mic orb */}
              <View style={styles.overlayFooter}>
                <Text style={[styles.overlayStatus, { color: theme.colors.subtle }]}>
                  Listening...
                </Text>
                <MicOrb
                  size={88}
                  active
                  onPress={stopVoiceAndSend}
                />
              </View>
            </SafeAreaView>
          </NeonEdgeFrame>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 1, justifyContent: 'center', alignItems: 'center',
  },
  iconBtnText: { fontSize: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12 },

  listContent: { paddingTop: 12, paddingBottom: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },

  taskToast: {
    marginHorizontal: 12, marginBottom: 6,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  taskToastText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  errorBanner: {
    marginHorizontal: 12, marginBottom: 8,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  errorText: { color: '#FFFFFF', fontSize: 13, textAlign: 'center' },

  // ───── Voice overlay ─────
  overlayTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  overlayCircleBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  overlayBackArrow: { color: '#FFFFFF', fontSize: 22, lineHeight: 22, marginTop: -2 },
  overlayPlus: { color: '#FFFFFF', fontSize: 22, lineHeight: 22, marginTop: -1 },
  overlayScroll: { flex: 1, marginTop: 32 },
  overlayScrollContent: { paddingHorizontal: 28, paddingBottom: 40 },
  overlayTranscript: {
    color: '#9A8AB8',
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '400',
  },
  overlayFooter: {
    alignItems: 'center',
    paddingBottom: 28,
    gap: 14,
  },
  overlayStatus: { fontSize: 13, letterSpacing: 0.4 },
});
