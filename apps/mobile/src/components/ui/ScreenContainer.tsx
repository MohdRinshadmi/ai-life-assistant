import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '@hooks/useTheme';

interface Props {
  children: React.ReactNode;
  /** Applied to the SafeAreaView content wrapper (e.g. horizontal padding). */
  style?: StyleProp<ViewStyle>;
  /** Safe-area edges to inset. Defaults to just the top (tab bar handles bottom). */
  edges?: Edge[];
}

const BACKDROP_LOCATIONS = [0, 0.5, 1];
const DEFAULT_EDGES: Edge[] = ['top'];

/*
 * Ambient light field (mirrors the web `--grad-backdrop`): a violet wash
 * bleeding from the top-left, a faint magenta bloom from the right edge,
 * and a violet floor glow. RN has no radial gradients, so each wash is a
 * corner-anchored linear fade to transparent.
 */
const WASH_VIOLET = ['rgba(139,0,255,0.20)', 'rgba(139,0,255,0.0)'];
const WASH_MAGENTA = ['rgba(255,0,140,0.10)', 'rgba(255,0,140,0.0)'];
const WASH_FLOOR = ['rgba(85,0,168,0.22)', 'rgba(85,0,168,0.0)'];
const VIOLET_START = { x: 0, y: 0 };
const VIOLET_END = { x: 0.65, y: 0.55 };
const MAGENTA_START = { x: 1, y: 0.2 };
const MAGENTA_END = { x: 0.35, y: 0.75 };
const FLOOR_START = { x: 0.5, y: 1 };
const FLOOR_END = { x: 0.5, y: 0.45 };

/**
 * ScreenContainer — the shared shell for every screen:
 * pure-black root, ambient violet/magenta light field, and a
 * SafeAreaView (top edge by default) wrapping the screen content.
 */
export function ScreenContainer({ children, style, edges = DEFAULT_EDGES }: Props) {
  const { theme } = useTheme();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={theme.colors.gradients.backdrop}
        locations={BACKDROP_LOCATIONS}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={WASH_VIOLET}
        start={VIOLET_START}
        end={VIOLET_END}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={WASH_MAGENTA}
        start={MAGENTA_START}
        end={MAGENTA_END}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={WASH_FLOOR}
        start={FLOOR_START}
        end={FLOOR_END}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <SafeAreaView style={[styles.flex, style]} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  flex: { flex: 1 },
});
