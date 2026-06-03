import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '@hooks/useTheme';

interface Props {
  children: React.ReactNode;
  thickness?: number;
  radius?: number;
  style?: ViewStyle;
}

/**
 * NeonEdgeFrame — wraps content with a glowing violet→magenta gradient
 * border that follows the screen edges (Syncra "Listening..." aesthetic).
 *
 * Implementation: a gradient layer fills the bounds, then an inset
 * black panel covers everything except a `thickness`-pixel ring at the edge.
 */
export function NeonEdgeFrame({ children, thickness = 2, radius = 32, style }: Props) {
  const { theme } = useTheme();
  return (
    <View style={[styles.outer, style]}>
      <LinearGradient
        colors={theme.colors.gradients.edge as unknown as string[]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      <View
        style={{
          position: 'absolute',
          top: thickness, bottom: thickness, left: thickness, right: thickness,
          backgroundColor: '#000000',
          borderRadius: radius - thickness,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, overflow: 'hidden' },
});
