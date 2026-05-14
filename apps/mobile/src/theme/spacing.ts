/**
 * Spacing & Layout System
 *
 * 4px grid system — every spacing value is a multiple of 4.
 * This ensures visual consistency and alignment across the entire UI.
 */

export const spacing = {
  /** 0px */  none: 0,
  /** 2px */  '2xs': 2,
  /** 4px */  xs: 4,
  /** 8px */  sm: 8,
  /** 12px */ md: 12,
  /** 16px */ base: 16,
  /** 20px */ lg: 20,
  /** 24px */ xl: 24,
  /** 32px */ '2xl': 32,
  /** 40px */ '3xl': 40,
  /** 48px */ '4xl': 48,
  /** 64px */ '5xl': 64,
  /** 80px */ '6xl': 80,
  /** 96px */ '7xl': 96,
} as const;

export const borderRadius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  }),
} as const;

export const layout = {
  screenPadding: spacing.base,
  cardPadding: spacing.base,
  inputHeight: 52,
  buttonHeight: 52,
  headerHeight: 56,
  tabBarHeight: 80,
  maxContentWidth: 600,
} as const;
