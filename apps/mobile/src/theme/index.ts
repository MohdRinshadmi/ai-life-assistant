import { colors } from './colors';
import { typography, textStyles } from './typography';
import { spacing, borderRadius, shadows, layout } from './spacing';

/**
 * Theme object — single source of truth for all design tokens.
 *
 * Usage:
 *   const theme = useTheme();
 *   <View style={{ backgroundColor: theme.colors.bg }}>
 *   <Text style={[theme.textStyles.h1, { color: theme.colors.heading }]}>
 */
export interface Theme {
  dark: boolean;
  colors: {
    // Surfaces
    bg: string;
    surface: string;
    elevated: string;
    border: string;
    // Text
    text: string;
    heading: string;
    subtle: string;
    muted: string;
    // Brand
    primary: string;
    primaryLight: string;
    primaryDark: string;
    accent: string;
    accentLight: string;
    // Semantic
    success: string;
    warning: string;
    error: string;
    info: string;
    // Utility
    white: string;
    black: string;
    transparent: string;
    // Gradients
    gradients: typeof colors.gradients;
  };
  typography: typeof typography;
  textStyles: typeof textStyles;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
  layout: typeof layout;
}

export const darkTheme: Theme = {
  dark: true,
  colors: {
    bg: colors.dark.bg,
    surface: colors.dark.surface,
    elevated: colors.dark.elevated,
    border: colors.dark.border,
    text: colors.dark.text,
    heading: colors.dark.heading,
    subtle: colors.dark.subtle,
    muted: colors.dark.muted,
    primary: colors.primary[500],
    primaryLight: colors.primary[400],
    primaryDark: colors.primary[700],
    accent: colors.accent[500],
    accentLight: colors.accent[400],
    success: colors.success.main,
    warning: colors.warning.main,
    error: colors.error.main,
    info: colors.info.main,
    white: colors.white,
    black: colors.black,
    transparent: colors.transparent,
    gradients: colors.gradients,
  },
  typography,
  textStyles,
  spacing,
  borderRadius,
  shadows,
  layout,
};

export const lightTheme: Theme = {
  dark: false,
  colors: {
    bg: colors.light.bg,
    surface: colors.light.surface,
    elevated: colors.light.elevated,
    border: colors.light.border,
    text: colors.light.text,
    heading: colors.light.heading,
    subtle: colors.light.subtle,
    muted: colors.light.muted,
    primary: colors.primary[600],
    primaryLight: colors.primary[500],
    primaryDark: colors.primary[800],
    accent: colors.accent[600],
    accentLight: colors.accent[500],
    success: colors.success.main,
    warning: colors.warning.main,
    error: colors.error.main,
    info: colors.info.main,
    white: colors.white,
    black: colors.black,
    transparent: colors.transparent,
    gradients: colors.gradients,
  },
  typography,
  textStyles,
  spacing,
  borderRadius,
  shadows,
  layout,
};

export { colors } from './colors';
export { typography, textStyles } from './typography';
export { spacing, borderRadius, shadows, layout } from './spacing';
