/**
 * Design System — Color Palette
 *
 * HSL-based for easy manipulation (lighten/darken by adjusting L).
 * Dark mode first — most AI apps use dark themes (easier on eyes, premium feel).
 */

export const colors = {
  // ── Brand Colors ──────────────────────────────────
  primary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1', // Main brand color (Indigo)
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
  },

  accent: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6', // Teal accent
    600: '#0D9488',
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
  },

  // ── Semantic Colors ───────────────────────────────
  success: {
    light: '#34D399',
    main: '#10B981',
    dark: '#059669',
  },
  warning: {
    light: '#FBBF24',
    main: '#F59E0B',
    dark: '#D97706',
  },
  error: {
    light: '#F87171',
    main: '#EF4444',
    dark: '#DC2626',
  },
  info: {
    light: '#60A5FA',
    main: '#3B82F6',
    dark: '#2563EB',
  },

  // ── Neutral (Dark Theme) ──────────────────────────
  dark: {
    bg: '#0F0F14',        // Deepest background
    surface: '#1A1A24',   // Card/modal backgrounds
    elevated: '#242435',  // Elevated surfaces
    border: '#2E2E42',    // Borders
    muted: '#4A4A6A',     // Disabled/muted text
    subtle: '#8888AA',    // Subtle text
    text: '#E4E4F0',      // Primary text
    heading: '#FFFFFF',   // Headings
  },

  // ── Neutral (Light Theme) ─────────────────────────
  light: {
    bg: '#FAFBFE',
    surface: '#FFFFFF',
    elevated: '#F5F6FA',
    border: '#E2E4ED',
    muted: '#B0B3C5',
    subtle: '#6B6F85',
    text: '#1E1E2E',
    heading: '#0A0A14',
  },

  // ── Utility ───────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // ── Gradient Presets ──────────────────────────────
  gradients: {
    primary: ['#6366F1', '#8B5CF6'],     // Indigo → Violet
    accent: ['#14B8A6', '#06B6D4'],      // Teal → Cyan
    warm: ['#F59E0B', '#EF4444'],        // Amber → Red
    cool: ['#3B82F6', '#6366F1'],        // Blue → Indigo
    dark: ['#1A1A24', '#0F0F14'],        // Surface → BG
    glass: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'],
  },
} as const;

export type ColorScheme = 'dark' | 'light';
