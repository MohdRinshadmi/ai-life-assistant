import { Platform } from 'react-native';

/**
 * Environment / host configuration.
 *
 * Anything that changes with where the app is *running* (dev host, emulator,
 * staging, prod) lives here — as opposed to `@constants`, which holds pure
 * environment-independent literals.
 *
 * Android emulators reach the developer's host machine via the special
 * `10.0.2.2` loopback alias; iOS simulators share the host's `localhost`.
 */
const API_HOST = Platform.select({
  android: 'http://10.0.2.2:3000', // Android emulator → host machine
  ios: 'http://localhost:3000',
  default: 'http://localhost:3000',
})!;

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
