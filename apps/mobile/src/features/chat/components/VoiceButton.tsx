import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@hooks/useTheme';

interface Props {
  isListening: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  disabled?: boolean;
}

export function VoiceButton({ isListening, onPressIn, onPressOut, disabled }: Props) {
  const { theme } = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.25, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(1);
    }
  }, [isListening, pulse]);

  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: isListening ? theme.colors.error : theme.colors.surface,
            borderColor: isListening ? theme.colors.error : theme.colors.border,
          },
        ]}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        activeOpacity={0.7}
        delayLongPress={0}
      >
        <MicIcon color={isListening ? '#FFFFFF' : theme.colors.subtle} />
      </TouchableOpacity>
    </Animated.View>
  );
}

function MicIcon({ color }: { color: string }) {
  return (
    <Animated.View style={styles.micContainer}>
      {/* Mic body */}
      <Animated.View style={[styles.micBody, { borderColor: color, backgroundColor: color }]} />
      {/* Mic stand */}
      <Animated.View style={[styles.micStand, { borderColor: color }]} />
      <Animated.View style={[styles.micBase, { backgroundColor: color }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    marginBottom: 2,
  },
  micContainer: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBody: {
    width: 6,
    height: 8,
    borderRadius: 3,
    position: 'absolute',
    top: 0,
  },
  micStand: {
    width: 10,
    height: 5,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    borderWidth: 1.5,
    borderTopWidth: 0,
    position: 'absolute',
    bottom: 2,
  },
  micBase: {
    width: 6,
    height: 1.5,
    borderRadius: 1,
    position: 'absolute',
    bottom: 0,
  },
});
