import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Pressable, ViewStyle } from 'react-native';
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

/**
 * MicOrb — the glowing centerpiece of the voice UI.
 *
 * Composed of three concentric layers:
 *   1. Outer glow ring   — large, low-opacity radial blur stand-in
 *   2. Mid glow ring     — semi-translucent violet/magenta wash
 *   3. Inner gradient    — solid mic button (violet → magenta)
 *
 * Layers 1 & 2 pulse via Animated.loop when `active` is true.
 */
export function MicOrb({ size = 100, active = false, onPress, onPressIn, onPressOut, style }: Props) {
  const { theme } = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(active ? 1 : 0.7)).current;

  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1.18, duration: 900, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(glowOpacity, { toValue: 1, duration: 900, useNativeDriver: true }),
            Animated.timing(glowOpacity, { toValue: 0.55, duration: 900, useNativeDriver: true }),
          ]),
        ])
      ).start();
    } else {
      pulse.stopAnimation();
      glowOpacity.stopAnimation();
      Animated.parallel([
        Animated.timing(pulse, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.7, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [active, pulse, glowOpacity]);

  const outer = size * 2.6;
  const mid = size * 1.6;

  return (
    <View style={[{ width: outer, height: outer, alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* Outer ambient glow */}
      <Animated.View
        style={[
          styles.absCenter,
          {
            width: outer, height: outer, borderRadius: outer / 2,
            opacity: Animated.multiply(glowOpacity, 0.35),
            transform: [{ scale: pulse }],
          },
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
          {
            width: mid, height: mid, borderRadius: mid / 2,
            opacity: Animated.multiply(glowOpacity, 0.6),
            transform: [{ scale: pulse }],
          },
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
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.button,
          {
            width: size, height: size, borderRadius: size / 2,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          },
        ]}
      >
        <LinearGradient
          colors={theme.colors.gradients.primary as unknown as string[]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
        />
        <MicIcon size={size * 0.42} />
      </Pressable>
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
