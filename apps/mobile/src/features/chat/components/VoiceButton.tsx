import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
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
          isListening
            ? { backgroundColor: theme.colors.error }
            : styles.buttonIdle,
        ]}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        activeOpacity={0.7}
        delayLongPress={0}
        accessibilityRole="button"
        accessibilityLabel={isListening ? 'Release to stop listening' : 'Hold to talk'}
      >
        <Icon
          name={isListening ? 'mic' : 'mic-outline'}
          size={19}
          color={isListening ? '#FFFFFF' : theme.colors.subtle}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonIdle: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});
