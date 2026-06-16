import React, { memo, useEffect } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  /** The (growing) message text. */
  text: string;
  /** True while tokens are still streaming in — drives per-word animation + cursor. */
  isStreaming: boolean;
  /** Text colour. Applied to the parent Text and every animated span. */
  color: string;
  /** Typography style (font size / line height); colour is applied separately. */
  style?: StyleProp<TextStyle>;
}

/**
 * StreamingText
 *
 * Renders an assistant message that is being streamed token-by-token over the
 * WebSocket. Each newly-arrived word fades in on the UI thread via Reanimated's
 * `entering` layout animation, giving a smooth 60fps progressive reveal instead
 * of text snapping in all at once.
 *
 * Why split on words rather than raw tokens?
 *   - The store accumulates tokens into a single `content` string, so the raw
 *     token boundaries aren't available here. Splitting on whitespace and
 *     keying each segment by its (stable, append-only) index means only the
 *     segments that just appeared mount — and therefore only they animate.
 *     Already-rendered words keep their key and never replay.
 *
 * Performance: animation is opt-in via `isStreaming`. Finished/historical
 * messages render as a single plain <Text> so we never mount hundreds of
 * animated nodes when scrolling back through a long conversation.
 */
export const StreamingText = memo(function StreamingText({
  text,
  isStreaming,
  color,
  style,
}: Props) {
  // Finished message (or empty): plain text, zero animated nodes.
  if (!isStreaming) {
    return <Text style={[style, { color }]}>{text}</Text>;
  }

  // Keep whitespace as its own segment so spacing/wrapping is preserved; drop
  // only the empty strings split() leaves at the boundaries.
  const segments = text.split(/(\s+)/).filter((s) => s.length > 0);

  return (
    <Text style={[style, { color }]}>
      {segments.map((segment, i) => (
        <Animated.Text
          // Stable per-index key: existing words never remount, so their fade
          // doesn't replay when the next token lands.
          key={i}
          entering={FadeIn.duration(180)}
          style={{ color }}
        >
          {segment}
        </Animated.Text>
      ))}
      <BlinkingCursor color={color} />
    </Text>
  );
});

/** Soft-blinking caret shown at the tail of the streaming text. */
function BlinkingCursor({ color }: { color: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 450 }),
        withTiming(1, { duration: 450 })
      ),
      -1,
      true
    );
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.Text style={[{ color }, animatedStyle]}>▌</Animated.Text>;
}
