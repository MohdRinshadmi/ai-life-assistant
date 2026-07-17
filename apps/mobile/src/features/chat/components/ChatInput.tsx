import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TextInput as RNTextInput,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@hooks/useTheme';
import { spacing } from '@theme';
import { VoiceButton } from './VoiceButton';

interface Props {
  onSend: (content: string) => void;
  isStreaming: boolean;
  disabled?: boolean;
  // Voice
  transcript?: string;
  isListening?: boolean;
  onVoicePressIn?: () => void;
  onVoicePressOut?: () => void;
  // Spoken replies toggle (lives in the composer's left slot)
  autoSpeak?: boolean;
  isSpeaking?: boolean;
  onToggleAutoSpeak?: () => void;
}

const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };

export function ChatInput({
  onSend,
  isStreaming,
  disabled,
  transcript,
  isListening = false,
  onVoicePressIn,
  onVoicePressOut,
  autoSpeak = false,
  isSpeaking = false,
  onToggleAutoSpeak,
}: Props) {
  const { theme } = useTheme();
  const [text, setText] = useState('');
  const inputRef = useRef<RNTextInput>(null);

  // Fill input when a voice transcript arrives
  useEffect(() => {
    if (transcript) {
      setText(transcript);
      inputRef.current?.focus();
    }
  }, [transcript]);

  const hasText = text.trim().length > 0;
  const canSend = hasText && !isStreaming && !disabled;

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View
        style={[
          styles.pill,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          disabled && styles.pillDisabled,
        ]}
      >
        {onToggleAutoSpeak && (
          <TouchableOpacity
            style={[styles.slotButton, autoSpeak && { backgroundColor: theme.colors.primary }]}
            onPress={onToggleAutoSpeak}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={autoSpeak ? 'Disable spoken replies' : 'Enable spoken replies'}
            accessibilityState={{ selected: autoSpeak }}
          >
            <Icon
              name={
                autoSpeak
                  ? isSpeaking
                    ? 'volume-high'
                    : 'volume-high-outline'
                  : 'volume-mute-outline'
              }
              size={19}
              color={autoSpeak ? '#FFFFFF' : theme.colors.subtle}
            />
          </TouchableOpacity>
        )}

        <TextInput
          ref={inputRef}
          style={[styles.input, { color: theme.colors.text }]}
          value={text}
          onChangeText={setText}
          placeholder="Ask anything"
          placeholderTextColor={theme.colors.subtle}
          multiline
          maxLength={4000}
          returnKeyType="default"
          blurOnSubmit={false}
          editable={!disabled}
        />

        {isStreaming || hasText ? (
          <TouchableOpacity
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <LinearGradient
              colors={theme.colors.gradients.primary}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={styles.sendButton}
            >
              {isStreaming ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Icon name="arrow-up" size={18} color="#FFFFFF" />
              )}
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          onVoicePressIn && (
            <VoiceButton
              isListening={isListening}
              onPressIn={onVoicePressIn}
              onPressOut={onVoicePressOut ?? (() => {})}
              disabled={disabled || isStreaming}
            />
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 26,
    borderWidth: 1,
    minHeight: 52,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  pillDisabled: {
    opacity: 0.5,
  },
  slotButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 9 : 7,
    paddingBottom: Platform.OS === 'ios' ? 9 : 7,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
