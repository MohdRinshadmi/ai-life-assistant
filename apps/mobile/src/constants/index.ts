/**
 * App-wide constant values.
 *
 * Pure, environment-independent literals only — anything that depends on the
 * host/build (URLs, timeouts that vary by environment) belongs in `@config`.
 */

/** react-native-keychain service identifier for the auth token blob. */
export const KEYCHAIN_AUTH_SERVICE = 'ai-life-assistant-auth';

/**
 * Socket.io reconnection / connection tuning spread into `io()`.
 * Transport selection is kept at the call site since it's contextually typed
 * against socket.io's transport union.
 */
export const SOCKET_OPTIONS = {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1_000,
  reconnectionDelayMax: 10_000,
  timeout: 20_000,
} as const;
