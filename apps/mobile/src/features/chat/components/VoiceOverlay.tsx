import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';
import { MicOrb, NeonEdgeFrame } from '@components/ui';
import { spacing } from '@theme';

interface Props {
  transcript: string;
  isListening: boolean;
  isTranscribing: boolean;
  /** Stop listening early (final transcript still arrives asynchronously). */
  onStop: () => void;
  /** Clear the live transcript and start over. */
  onClear: () => void;
}

/**
 * VoiceOverlay — full-screen "Listening…" surface shown over the chat while
 * the mic is hot: neon gradient edge frame, live transcript, and the pulsing
 * MicOrb to stop capture.
 */
export function VoiceOverlay({ transcript, isListening, isTranscribing, onStop, onClear }: Props) {
  const { theme } = useTheme();

  return (
    <View style={StyleSheet.absoluteFill}>
      <NeonEdgeFrame thickness={2.5} radius={36}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          {/* top bar with back / new */}
          <View style={styles.overlayTop}>
            <TouchableOpacity
              style={styles.overlayCircleBtn}
              onPress={onStop}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Stop listening"
            >
              <Text style={styles.overlayBackArrow}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.overlayCircleBtn}
              onPress={onClear}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Clear transcript"
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
              {transcript ||
                (isTranscribing ? 'Transcribing…' : 'Listening for your voice…')}
            </Text>
          </ScrollView>

          {/* footer: status + mic orb */}
          <View style={styles.overlayFooter}>
            <Text style={[styles.overlayStatus, { color: theme.colors.subtle }]}>
              {isTranscribing ? 'Transcribing…' : 'Listening...'}
            </Text>
            <MicOrb size={88} active={isListening} onPress={onStop} />
          </View>
        </SafeAreaView>
      </NeonEdgeFrame>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlayTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
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
  overlayScroll: { flex: 1, marginTop: spacing['2xl'] },
  overlayScrollContent: { paddingHorizontal: 28, paddingBottom: spacing['3xl'] },
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
