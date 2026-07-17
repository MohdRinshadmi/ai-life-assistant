import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '@hooks/useTheme';

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
      colors={theme.colors.gradients.primarySoft}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[styles.wrap, { borderRadius }, style]}
    >
      <View
        style={[
          styles.inner,
          { backgroundColor: theme.colors.surface, borderRadius: borderRadius - 1 },
        ]}
      >
        <LinearGradient
          colors={theme.colors.gradients.surface}
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
  wrap: { padding: 1 },
  // flexGrow (not flex: 1) so the surface fills fixed-size cards but still
  // hugs content when the card is sized by its content (Tasks/Notes rows).
  inner: { flexGrow: 1, padding: 16, overflow: 'hidden' },
});
