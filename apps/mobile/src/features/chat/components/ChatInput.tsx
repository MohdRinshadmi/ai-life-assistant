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
import { useTheme } from '../../../hooks/useTheme';
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
}

export function ChatInput({
  onSend,
  isStreaming,
  disabled,
  transcript,
  isListening = false,
  onVoicePressIn,
  onVoicePressOut,
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

  const canSend = text.trim().length > 0 && !isStreaming && !disabled;

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, borderTopColor: theme.colors.border }]}>
      <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: theme.colors.text }]}
          value={text}
          onChangeText={setText}
          placeholder="Message your AI assistant..."
          placeholderTextColor={theme.colors.subtle}
          multiline
          maxLength={4000}
          returnKeyType="default"
          blurOnSubmit={false}
          editable={!disabled}
        />

        {onVoicePressIn && (
          <VoiceButton
            isListening={isListening}
            onPressIn={onVoicePressIn}
            onPressOut={onVoicePressOut ?? (() => {})}
            disabled={disabled || isStreaming}
          />
        )}

        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: canSend ? theme.colors.primary : theme.colors.border },
          ]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.75}
        >
          {isStreaming ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <SendIcon />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SendIcon() {
  return (
    <View style={styles.sendIcon}>
      <View style={styles.sendArrow} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 10 : 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    maxHeight: 120,
    paddingTop: Platform.OS === 'ios' ? 4 : 2,
    paddingBottom: Platform.OS === 'ios' ? 4 : 2,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: 2,
  },
  sendIcon: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendArrow: {
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
    marginLeft: 2,
  },
});
