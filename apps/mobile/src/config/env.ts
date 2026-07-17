import { NativeModules } from 'react-native';
import { logger } from '@utils/logger';

/**
 * Environment / host configuration.
 *
 * Anything that changes with where the app is *running* (dev host, emulator,
 * staging, prod) lives here — as opposed to `@constants`, which holds pure
 * environment-independent literals.
 *
 * ── How the dev API host is resolved ──────────────────────────────────────
 * The hard part in React Native dev is "what address actually reaches my
 * laptop?", and the answer differs per run target:
 *
 *   - iOS Simulator   → `localhost` (shares the Mac's network stack)
 *   - Android Emulator → `10.0.2.2`  (special alias for the host machine)
 *   - Physical device  → the Mac's LAN IP (e.g. 192.168.x.x); `localhost`
 *                        would point at the phone itself and silently fail.
 *
 * Instead of hard-coding an IP that breaks the moment you switch Wi-Fi, we
 * read it from Metro: in a dev build the JS bundle is downloaded from your
 * machine, so RN records that origin in `SourceCode.scriptURL`
 * (e.g. "http://192.168.12.28:8081/index.bundle?..."). Reusing that host
 * means the API base URL automatically tracks wherever Metro is reachable —
 * simulator, emulator, or a real device on the same network — with no edits.
 *
 * In release builds `scriptURL` points at the packaged bundle (no host), so
 * we fall back to PROD_HOST. Override PROD_HOST with your real API origin
 * before shipping.
 */

const DEV_PORT = 3000;
// No server deployed yet — point release builds at the dev machine on the LAN.
// Replace with your real https:// API origin before shipping to the App/Play store.
const PROD_HOST = `http://192.168.12.28:${DEV_PORT}`;

/**
 * Platform default used when we can't infer Metro's host — which happens on the
 * New Architecture (bridgeless), where `SourceCode.scriptURL` is often undefined.
 *
 * Android uses `localhost` (NOT `10.0.2.2`): React Native sets up `adb reverse`
 * for Metro's port over USB/emulator, and we forward the API port the same way
 * (`adb reverse tcp:3000 tcp:3000`, wired into the `android` npm script). With
 * the reverse in place, `localhost` reaches the dev machine on BOTH physical
 * devices and emulators — unlike `10.0.2.2`, which only works on emulators.
 */
const DEV_FALLBACK_HOST = `http://localhost:${DEV_PORT}`;

/**
 * Extract the Metro packager host (the address that reaches the dev machine)
 * from the running bundle's URL, then point it at the API port.
 *
 * The rule is universal: whatever host Metro is reachable at, the dev machine
 * — and therefore the API — is at that same host. We only swap the port. This
 * is correct for every dev target, so no per-platform special-casing is needed:
 *   - iOS Simulator       → localhost:8081     → localhost:3000
 *   - Android Emulator    → 10.0.2.2:8081      → 10.0.2.2:3000
 *   - Physical (Wi-Fi)    → 192.168.x.x:8081   → 192.168.x.x:3000
 *   - Physical (adb reverse) → localhost:8081  → localhost:3000  (adb reverse 3000 too)
 *
 * Returns null when no usable host is present (release builds package the
 * bundle as a local file path, so the http(s) match fails).
 */
function resolveDevHostFromMetro(): string | null {
  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL) return null;

  // scriptURL looks like "http://192.168.12.28:8081/index.bundle?platform=ios..."
  const match = scriptURL.match(/^https?:\/\/([^/:]+)(?::\d+)?\//);
  const host = match?.[1];
  if (!host) return null;

  return `http://${host}:${DEV_PORT}`;
}

const API_HOST = __DEV__
  ? resolveDevHostFromMetro() ?? DEV_FALLBACK_HOST
  : PROD_HOST;

// Diagnostic: confirms which host the app talks to and why (dev-only output).
logger.info('API host resolution', {
  scriptURL: NativeModules?.SourceCode?.scriptURL,
  resolved: API_HOST,
});

export const env = {
  /** Versioned REST API base URL. */
  apiBaseUrl: `${API_HOST}/api/v1`,
  /** Socket.io origin (unversioned). */
  socketUrl: API_HOST,
  /** Default REST request timeout (ms). */
  apiTimeout: 30_000,
  /** True in Metro dev builds; mirrors React Native's global `__DEV__`. */
  isDev: __DEV__,
} as const;

export type Env = typeof env;
