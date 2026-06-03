import React, { memo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { UIMessage } from '../hooks/useChat';
import { useTheme } from '@hooks/useTheme';

interface Props {
  message: UIMessage;
}

export const MessageBubble = memo(function MessageBubble({ message }: Props) {
  const { theme } = useTheme();
  const isUser = message.role === 'user';

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.avatarText}>AI</Text>
        </View>
      )}

      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: theme.colors.primary }]
            : [styles.bubbleAssistant, { backgroundColor: theme.colors.surface }],
          { maxWidth: '80%' },
        ]}
      >
        {message.isStreaming && message.content === '' ? (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color={theme.colors.subtle} />
          </View>
        ) : (
          <Text
            style={[
              styles.text,
              { color: isUser ? '#FFFFFF' : theme.colors.text },
            ]}
          >
            {message.content}
            {message.isStreaming && <Text style={{ color: theme.colors.subtle }}>▌</Text>}
          </Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  typingIndicator: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
});
