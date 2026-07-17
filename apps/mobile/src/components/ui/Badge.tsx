import React from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';

interface Props {
  label: string;
  /** Base color — fill is `${color}22`, border `${color}66`, text the color itself. */
  color: string;
  /** Show a small leading dot in the badge color (used for task priority). */
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Badge — tiny status/priority pill with a translucent tinted fill and a
 * soft border of the same hue (the `${color}22` / `${color}66` pattern used
 * across the task list).
 */
export function Badge({ label, color, dot = false, style }: Props) {
  return (
    <View
      accessibilityLabel={label}
      style={[
        styles.badge,
        { backgroundColor: `${color}22`, borderColor: `${color}66` },
        style,
      ]}
    >
      {dot && <View style={[styles.dot, { backgroundColor: color }]} />}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});
