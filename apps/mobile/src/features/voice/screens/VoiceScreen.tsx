import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Tts from 'react-native-tts';

import { useTheme } from '@hooks/useTheme';
import { useSpeechTranscription } from '@hooks/useSpeechTranscription';
import { MicOrb } from '@components/ui/MicOrb';
import { GlassCard } from '@components/ui/GlassCard';

import { useVoiceStore } from '../stores/voiceStore';

interface VoiceScreenProps {
  /**
   * Called when the user confirms a captured command. The Chat route would
   * consume this to seed a message. Optional so the screen also works as a
   * standalone capture surface (it always stashes the transcript in the store).
   */
  onComplete?: (transcript: string) => void;
  /** Speak short status cues aloud (off by default — hands-free, but quiet). */
  speakFeedback?: boolean;
}

/** Maps engine state -> a short, human-readable status line. */
function statusLabel(
  state: ReturnType<typeof useSpeechTranscription>['state'],
  hasTranscript: boolean,
): string {
  switch (state) {
    case 'listening':
      return 'Listening…';
    case 'stopping':
      return 'Finishing up…';
    case 'backgrounded':
      return 'Paused';
    case 'idle':
    default:
      return hasTranscript ? 'Got it. Tap the mic to redo.' : 'Tap the mic to speak';
  }
}

export function VoiceScreen({ onComplete, speakFeedback = false }: VoiceScreenProps) {
  const { theme } = useTheme();
  const setLastTranscript = useVoiceStore((s) => s.setLastTranscript);

  const { transcript, state, error, start, stop, reset } = useSpeechTranscription({
    autoRequestPermissions: true,
    locale: 'en-US',
    partialResults: true,
  });

  const isListening = state === 'listening';
  const isBusy = state === 'stopping';
  const trimmed = transcript.trim();
  const hasTranscript = trimmed.length > 0;

  // Guard against speaking the same cue repeatedly on every render.
  const lastSpoken = useRef<string | null>(null);
  useEffect(() => {
    if (!speakFeedback) return;
    const cue = state === 'listening' ? "I'm listening" : null;
    if (cue && lastSpoken.current !== cue) {
      lastSpoken.current = cue;
      Tts.stop();
      Tts.speak(cue);
    }
    if (!cue) lastSpoken.current = null;
  }, [speakFeedback, state]);

  const handleMicPress = useCallback(() => {
    if (isListening) {
      void stop();
    } else {
      void start();
    }
  }, [isListening, start, stop]);

  const handleDone = useCallback(() => {
    if (isListening) {
      void stop();
    }
    if (hasTranscript) {
      setLastTranscript(trimmed);
      onComplete?.(trimmed);
    }
  }, [isListening, stop, hasTranscript, trimmed, setLastTranscript, onComplete]);

  const handleClear = useCallback(() => {
    reset();
  }, [reset]);

  const status = useMemo(
    () => statusLabel(state, hasTranscript),
    [state, hasTranscript],
  );

  const errorMessage = useMemo(() => {
    if (!error) return null;
    switch (error.code) {
      case 'E_PERMISSION_DENIED':
        return 'Microphone access is off. Enable it in Settings to use voice commands.';
      case 'E_PERMISSION_RESTRICTED':
        return 'Voice input is restricted on this device.';
      case 'E_RECOGNIZER_UNAVAILABLE':
        return 'Voice recognition is not available on this device.';
      case 'E_LOCALE_NOT_SUPPORTED':
        return 'This language is not supported for voice input.';
      default:
        return error.message || 'Something went wrong. Tap the mic to try again.';
    }
  }, [error]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={theme.colors.gradients.backdrop as unknown as string[]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.heading }]}>Voice Command</Text>
          <Text style={[styles.subtitle, { color: theme.colors.subtle }]}>
            Speak naturally — create tasks, capture notes, or ask anything.
          </Text>
        </View>

        {/* Centerpiece mic */}
        <View style={styles.orbZone}>
          <MicOrb size={108} active={isListening} onPress={handleMicPress} />
          <View style={styles.statusRow}>
            {isBusy && (
              <ActivityIndicator
                size="small"
                color={theme.colors.accent}
                style={styles.statusSpinner}
              />
            )}
            <Text
              style={[
                styles.statusText,
                { color: isListening ? theme.colors.heading : theme.colors.subtle },
              ]}
            >
              {status}
            </Text>
          </View>
        </View>

        {/* Transcript / error / empty panel */}
        <View style={styles.panelZone}>
          <GlassCard borderRadius={20} style={styles.panelCard}>
            {errorMessage ? (
              <View style={styles.panelInner}>
                <Text style={[styles.errorTitle, { color: theme.colors.accent }]}>
                  Can’t listen right now
                </Text>
                <Text style={[styles.errorBody, { color: theme.colors.text }]}>
                  {errorMessage}
                </Text>
              </View>
            ) : hasTranscript ? (
              <ScrollView
                contentContainerStyle={styles.panelInner}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[styles.transcriptLabel, { color: theme.colors.subtle }]}>
                  {isListening ? 'Hearing…' : 'You said'}
                </Text>
                <Text style={[styles.transcriptText, { color: theme.colors.text }]}>
                  {trimmed}
                </Text>
              </ScrollView>
            ) : (
              <View style={[styles.panelInner, styles.panelCenter]}>
                <Text style={[styles.placeholderText, { color: theme.colors.muted }]}>
                  {isListening
                    ? 'Listening for your command…'
                    : 'Your words will appear here.'}
                </Text>
              </View>
            )}
          </GlassCard>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleClear}
            disabled={!hasTranscript || isListening}
            style={[
              styles.secondaryBtn,
              { borderColor: theme.colors.border },
              (!hasTranscript || isListening) && styles.disabled,
            ]}
          >
            <Text style={[styles.secondaryText, { color: theme.colors.subtle }]}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleDone}
            disabled={!hasTranscript}
            style={[styles.doneShadow, !hasTranscript && styles.disabled]}
          >
            <LinearGradient
              colors={theme.colors.gradients.primary as unknown as string[]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.doneBtn}
            >
              <Text style={styles.doneText}>{isListening ? 'Stop & Use' : 'Done'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  flex: { flex: 1, paddingHorizontal: 20 },

  header: { marginTop: 8, gap: 8 },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { fontSize: 13, lineHeight: 19 },

  orbZone: { alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  statusSpinner: { marginRight: 8 },
  statusText: { fontSize: 15, fontWeight: '500' },

  panelZone: { flex: 1, marginTop: 4, marginBottom: 16 },
  panelCard: { flex: 1 },
  panelInner: { padding: 4, flexGrow: 1 },
  panelCenter: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 14, textAlign: 'center' },

  transcriptLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  transcriptText: { fontSize: 19, lineHeight: 27, fontWeight: '500' },

  errorTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  errorBody: { fontSize: 14, lineHeight: 20 },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 24,
  },
  secondaryBtn: {
    paddingHorizontal: 22,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: 15, fontWeight: '500' },

  doneShadow: {
    flex: 1,
    shadowColor: '#8B00FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  doneBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  disabled: { opacity: 0.4 },
});
