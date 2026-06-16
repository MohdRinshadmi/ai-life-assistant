import React, { memo, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type EntryExitAnimationFunction,
} from 'react-native-reanimated';
import { UIMessage } from '../hooks/useChat';
import { useTheme } from '@hooks/useTheme';
import { StreamingText } from './StreamingText';

interface Props {
  message: UIMessage;
  /**
   * Play the entering animation. Only the newest message should animate —
   * FlatList unmounts far-offscreen rows, so an unconditional `entering`
   * would replay every time the user scrolls back through history.
   */
  animateEntry?: boolean;
}

const SPRING = { damping: 18, stiffness: 240, mass: 0.8 };

/**
 * Custom entering worklet: fade + rise + settle-scale, sliding in from the
 * sender's side. Runs entirely on the UI thread.
 */
function makeEntering(fromX: number): EntryExitAnimationFunction {
  return () => {
    'worklet';
    return {
      initialValues: {
        opacity: 0,
        transform: [{ translateX: fromX }, { translateY: 14 }, { scale: 0.94 }],
      },
      animations: {
        opacity: withTiming(1, { duration: 160 }),
        transform: [
          { translateX: withSpring(0, SPRING) },
          { translateY: withSpring(0, SPRING) },
          { scale: withSpring(1, SPRING) },
        ],
      },
    };
  };
}

const enterFromRight = makeEntering(24);
const enterFromLeft = makeEntering(-24);

export const MessageBubble = memo(function MessageBubble({ message, animateEntry = false }: Props) {
  const { theme } = useTheme();
  const isUser = message.role === 'user';

  return (
    <Animated.View
      entering={animateEntry ? (isUser ? enterFromRight : enterFromLeft) : undefined}
      style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}
    >
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
          <TypingDots color={theme.colors.subtle} />
        ) : (
          <StreamingText
            text={message.content}
            isStreaming={!!message.isStreaming}
            color={isUser ? '#FFFFFF' : theme.colors.text}
            style={styles.text}
          />
        )}
      </View>
    </Animated.View>
  );
});

/** Three dots bouncing in a staggered wave while the assistant "thinks". */
function TypingDots({ color }: { color: string }) {
  return (
    <View style={styles.typingIndicator}>
      <TypingDot delay={0} color={color} />
      <TypingDot delay={140} color={color} />
      <TypingDot delay={280} color={color} />
    </View>
  );
}

function TypingDot({ delay, color }: { delay: number; color: string }) {
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 260 }),
          withTiming(0, { duration: 260 })
        ),
        -1
      )
    );
    return () => cancelAnimation(offset);
  }, [delay, offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
    opacity: interpolate(offset.value, [-5, 0], [1, 0.45]),
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, animatedStyle]} />;
}

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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
