import React, { memo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
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
import { spacing } from '@theme';

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

export const MessageBubble = memo(function MessageBubbleInner({ message, animateEntry = false }: Props) {
  const { theme } = useTheme();
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <Animated.View
        entering={animateEntry ? enterFromRight : undefined}
        style={[styles.row, styles.rowUser]}
      >
        <View style={[styles.userBubble, { backgroundColor: theme.colors.elevated }]}>
          <StreamingText
            text={message.content}
            isStreaming={!!message.isStreaming}
            color={theme.colors.heading}
            style={styles.userText}
          />
        </View>
      </Animated.View>
    );
  }

  // Assistant replies render bubble-less: full-width plain text, no avatar.
  return (
    <Animated.View
      entering={animateEntry ? enterFromLeft : undefined}
      style={[styles.row, styles.rowAssistant]}
    >
      {message.isStreaming && message.content === '' ? (
        <TypingDots color={theme.colors.subtle} />
      ) : (
        <StreamingText
          text={message.content}
          isStreaming={!!message.isStreaming}
          color={theme.colors.text}
          style={styles.assistantText}
        />
      )}
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
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  rowUser: {
    alignItems: 'flex-end',
  },
  rowAssistant: {
    alignItems: 'flex-start',
  },
  userBubble: {
    maxWidth: '78%',
    borderRadius: 22,
    borderBottomRightRadius: 8,
    paddingHorizontal: spacing.base,
    paddingVertical: 10,
  },
  userText: {
    fontSize: 15,
    lineHeight: 22,
  },
  assistantText: {
    fontSize: 15,
    lineHeight: 23,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
