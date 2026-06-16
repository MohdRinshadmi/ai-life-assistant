import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '@hooks/useTheme';

interface Props {
  size?: number;
  active?: boolean;          // pulsing glow while listening
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESS_SPRING = { damping: 14, stiffness: 320 };

/**
 * MicOrb — the glowing centerpiece of the voice UI.
 *
 * Composed of three concentric layers:
 *   1. Outer glow ring   — large, low-opacity radial blur stand-in
 *   2. Mid glow ring     — semi-translucent violet/magenta wash
 *   3. Inner gradient    — solid mic button (violet → magenta)
 *
 * Layers 1 & 2 pulse via a Reanimated withRepeat loop on the UI thread while
 * `active` is true, so the glow keeps breathing even when JS is busy
 * (e.g. streaming transcript updates).
 */
export function MicOrb({ size = 100, active = false, onPress, onPressIn, onPressOut, style }: Props) {
  const { theme } = useTheme();
  const pulse = useSharedValue(1);
  const glow = useSharedValue(active ? 1 : 0.7);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.18, { duration: 900 }),
          withTiming(1, { duration: 900 })
        ),
        -1
      );
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900 }),
          withTiming(0.55, { duration: 900 })
        ),
        -1
      );
    } else {
      cancelAnimation(pulse);
      cancelAnimation(glow);
      pulse.value = withTiming(1, { duration: 200 });
      glow.value = withTiming(0.7, { duration: 200 });
    }
    return () => {
      cancelAnimation(pulse);
      cancelAnimation(glow);
    };
  }, [active, pulse, glow]);

  const outerStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.35,
    transform: [{ scale: pulse.value }],
  }));

  const midStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.6,
    transform: [{ scale: pulse.value }],
  }));

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const outer = size * 2.6;
  const mid = size * 1.6;

  return (
    <View style={[{ width: outer, height: outer, alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* Outer ambient glow */}
      <Animated.View
        style={[
          styles.absCenter,
          { width: outer, height: outer, borderRadius: outer / 2 },
          outerStyle,
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['rgba(139,0,255,0.45)', 'rgba(255,0,140,0.0)']}
          start={{ x: 0.5, y: 0.5 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Mid glow ring */}
      <Animated.View
        style={[
          styles.absCenter,
          { width: mid, height: mid, borderRadius: mid / 2 },
          midStyle,
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={theme.colors.gradients.micGlow as unknown as string[]}
          start={{ x: 0.1, y: 0.1 }} end={{ x: 0.9, y: 0.9 }}
          style={[StyleSheet.absoluteFill, { borderRadius: mid / 2 }]}
        />
      </Animated.View>

      {/* Solid mic button */}
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => {
          pressScale.value = withSpring(0.94, PRESS_SPRING);
          onPressIn?.();
        }}
        onPressOut={() => {
          pressScale.value = withSpring(1, PRESS_SPRING);
          onPressOut?.();
        }}
        style={[
          styles.button,
          { width: size, height: size, borderRadius: size / 2 },
          pressStyle,
        ]}
      >
        <LinearGradient
          colors={theme.colors.gradients.primary as unknown as string[]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
        />
        <MicIcon size={size * 0.42} />
      </AnimatedPressable>
    </View>
  );
}

function MicIcon({ size }: { size: number }) {
  // Simple capsule + stand mic glyph drawn with views (no icon font dependency)
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.42,
        height: size * 0.6,
        borderRadius: size * 0.21,
        backgroundColor: '#FFFFFF',
        position: 'absolute',
        top: size * 0.06,
      }} />
      <View style={{
        width: size * 0.7,
        height: size * 0.36,
        borderBottomLeftRadius: size * 0.35,
        borderBottomRightRadius: size * 0.35,
        borderWidth: size * 0.07,
        borderTopWidth: 0,
        borderColor: '#FFFFFF',
        position: 'absolute',
        bottom: size * 0.12,
      }} />
      <View style={{
        width: size * 0.42,
        height: size * 0.07,
        backgroundColor: '#FFFFFF',
        borderRadius: size * 0.035,
        position: 'absolute',
        bottom: 0,
      }} />
    </View>
  );
}

const styles = StyleSheet.create({
  absCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#8B00FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 12,
  },
});
