/**
 * Design System — Color Palette
 *
 * Inspired by AI voice interfaces (Syncra-style) — deep blacks, vivid purple
 * & magenta gradients, soft neon glows. Dark-mode-first; light mode kept as
 * a graceful fallback.
 */

// ── Gradient Presets ──────────────────────────────
// Most gradients are 3-stop violet → magenta for a richer, glossier blend.
// Typed as `string[]` (not readonly tuples) so they can be passed straight
// to LinearGradient's `colors` prop without casting.
export type GradientKey =
  | 'primary'
  | 'primarySoft'
  | 'micGlow'
  | 'edge'
  | 'surface'
  | 'button'
  | 'pillBorder'
  | 'backdrop'
  | 'glass';

const gradients: Record<GradientKey, string[]> = {
  primary: ['#8B00FF', '#FF008C'],                       // Violet → Magenta (CTAs, mic)
  primarySoft: ['#5500A8', '#A8005C'],                   // Dimmer for borders / outlines
  micGlow: ['#B566FF', '#FF008C', '#FF2E97'],            // 3-stop for radial mic glow
  edge: ['#8B00FF', '#FF008C', '#8B00FF'],               // Neon edge frame (listening)
  surface: ['rgba(139,0,255,0.06)', 'rgba(255,0,140,0.04)'], // Card glass tint
  button: ['#1A0E2E', '#0E0816'],                        // Dark glossy button fill
  pillBorder: ['#8B00FF', '#FF008C'],                    // Pill button stroke
  backdrop: ['#000000', '#0E0816', '#000000'],           // Screen bg with violet middle
  glass: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'],
};

export const colors = {
  // ── Brand Colors ──────────────────────────────────
  // Vivid violet — used for primary CTAs, active states, mic glow
  primary: {
    50: '#F5E9FF',
    100: '#E5C9FF',
    200: '#CE99FF',
    300: '#B566FF',
    400: '#9D33FF',
    500: '#8B00FF', // Main brand violet
    600: '#7000D9',
    700: '#5500A8',
    800: '#3D0078',
    900: '#26004A',
  },

  // Hot magenta accent — used for gradient endpoints, highlights
  accent: {
    50: '#FFE4F2',
    100: '#FFB8DD',
    200: '#FF8AC6',
    300: '#FF5BAE',
    400: '#FF2E97',
    500: '#FF008C', // Main accent magenta
    600: '#D60074',
    700: '#A8005C',
    800: '#7A0042',
    900: '#4D002A',
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
  // Deep blacks with a hint of violet for that AI-voice premium feel
  dark: {
    bg: '#000000',         // Pure black canvas
    surface: '#0E0816',    // Card / modal — slightly violet-tinted
    elevated: '#160C24',   // Elevated surfaces (modals, popovers)
    border: '#241636',     // Hairline borders — violet-tinted
    muted: '#3A2A52',      // Disabled / muted
    subtle: '#9A8AB8',     // Subtle text (lavender-grey)
    text: '#E8E4F0',       // Primary body text
    heading: '#FFFFFF',    // Headings — pure white
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
  gradients,
} as const;

export type ColorScheme = 'dark' | 'light';
