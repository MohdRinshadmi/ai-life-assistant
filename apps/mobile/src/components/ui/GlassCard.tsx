import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  borderRadius?: number;
}

/**
 * GlassCard — frosted dark surface with hairline violet border.
 * Used for action shortcuts and overlay panels in the Syncra-style UI.
 */
export function GlassCard({ children, style, borderRadius = 18 }: Props) {
  const { theme } = useTheme();
  return (
    <LinearGradient
      colors={theme.colors.gradients.primarySoft as unknown as string[]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[{ borderRadius, padding: 1 }, style]}
    >
      <View
        style={[
          styles.inner,
          { backgroundColor: theme.colors.surface, borderRadius: borderRadius - 1 },
        ]}
      >
        <LinearGradient
          colors={theme.colors.gradients.surface as unknown as string[]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: borderRadius - 1 }]}
          pointerEvents="none"
        />
        {children}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  inner: { padding: 16, overflow: 'hidden' },
});
