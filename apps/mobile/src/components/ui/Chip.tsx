import React from 'react';
import { StyleSheet, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@hooks/useTheme';

interface Props {
  label: string;
  active?: boolean;
  onPress: () => void;
  /** Fill/border color when active. Defaults to the brand primary. */
  activeColor?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Chip — small filter pill (≈34pt tall, fully rounded). Active chips fill
 * with the accent color; inactive chips sit on the dark surface with a
 * hairline border, matching the Tasks/Notes filter rows.
 */
export function Chip({ label, active = false, onPress, activeColor, style }: Props) {
  const { theme } = useTheme();
  const fill = activeColor ?? theme.colors.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[
        styles.chip,
        active
          ? { backgroundColor: fill, borderColor: fill }
          : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        style,
      ]}
    >
      <Text
        style={[styles.label, active ? styles.labelActive : { color: theme.colors.subtle }]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 13, fontWeight: '500' },
  labelActive: { color: '#FFFFFF' },
});
