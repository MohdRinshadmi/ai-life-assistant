import React from 'react';
import { StyleSheet, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@hooks/useTheme';

interface Props {
  checked: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

/**
 * Checkbox — the round completion toggle from task rows:
 * done → success-green fill with a white check, undone → bordered circle.
 */
export function Checkbox({ checked, onPress, accessibilityLabel, style }: Props) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked }}
      style={[
        styles.box,
        checked
          ? { borderColor: theme.colors.success, backgroundColor: theme.colors.success }
          : { borderColor: theme.colors.border, backgroundColor: theme.colors.transparent },
        style,
      ]}
    >
      {checked && <Text style={styles.check}>✓</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});
