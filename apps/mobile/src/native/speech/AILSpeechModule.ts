/**
 * AILSpeechModule
 *
 * Thin, strongly-typed wrapper around the iOS-native `AILSpeech` module.
 * App code should always import from here (or from `./index`), never from
 * `NativeModules.AILSpeech` directly.
 *
 * Responsibilities:
 *   - Stable, promise-based control API (start/stop/permissions).
 *   - Strongly-typed event subscription with auto-cleanup helpers.
 *   - Platform guarding — module is iOS-only today; Android calls degrade to
 *     a clear rejection rather than a confusing `undefined is not a function`.
 *   - One-time linker check so we fail loudly during dev if the iOS pod
 *     wasn't installed.
 */
import {
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
  type EmitterSubscription,
} from 'react-native';

import type {
  SpeechPermissionResult,
  SpeechAvailability,
  StartSpeechOptions,
  SpeechEventMap,
} from './types';

const LINKING_ERROR =
  `AILSpeech native module is not linked.\n\n` +
  `• iOS: did you run \`pod install\` inside ios/ and rebuild (not just reload JS)?\n` +
  `• Android: did you rebuild after adding AILSpeechPackage() in MainApplication.kt?`;

interface NativeAILSpeech {
  getPermissionStatus(): Promise<SpeechPermissionResult>;
  requestPermissions(): Promise<SpeechPermissionResult>;
  isAvailable(locale: string): Promise<SpeechAvailability>;
  start(options: StartSpeechOptions): Promise<{ started: boolean; locale: string }>;
  stop(): Promise<{ stopped: boolean }>;
  cancel(): Promise<{ cancelled: boolean }>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

// Proxy that throws a helpful error if the module is missing. We don't crash
// at import time because that would break Jest unit tests and Android dev.
const Native: NativeAILSpeech =
  NativeModules.AILSpeech ??
  (new Proxy({} as NativeAILSpeech, {
    get() {
      throw new Error(LINKING_ERROR);
    },
  }) as NativeAILSpeech);

// Implemented on both iOS (Swift) and Android (Kotlin) now — gate purely on
// whether the native module registered.
const isSupported = !!NativeModules.AILSpeech;

/**
 * Single shared emitter. RN reference-counts listeners under the hood, so we
 * don't need to reinstantiate per-subscription.
 */
const emitter = isSupported ? new NativeEventEmitter(NativeModules.AILSpeech) : null;

/**
 * Subscribe to a single typed speech event. Returns the `EmitterSubscription`
 * so the caller can `.remove()` it during cleanup — this is intentionally
 * lower-level than RxJS to keep the wrapper dependency-free.
 *
 * Strong typing across event name → payload prevents the classic native-module
 * bug of subscribing to "AILSpeech.final" but typing the payload as PartialEvent.
 */
export function addSpeechListener<K extends keyof SpeechEventMap>(
  event: K,
  listener: (payload: SpeechEventMap[K]) => void,
): EmitterSubscription {
  if (!emitter) {
    // Return a no-op subscription so callers don't have to branch on platform.
    return { remove: () => {} } as EmitterSubscription;
  }
  return emitter.addListener(event, listener);
}

/**
 * Convenience: subscribe to multiple events and return a single tear-down fn.
 * Designed to match `useEffect` cleanup semantics.
 */
export function addSpeechListeners(
  listeners: {
    [K in keyof SpeechEventMap]?: (payload: SpeechEventMap[K]) => void;
  },
): () => void {
  const subs: EmitterSubscription[] = [];
  (Object.keys(listeners) as Array<keyof SpeechEventMap>).forEach((event) => {
    const cb = listeners[event];
    if (cb) subs.push(addSpeechListener(event, cb as never));
  });
  return () => subs.forEach((s) => s.remove());
}

export const AILSpeech = {
  isSupported,

  getPermissionStatus(): Promise<SpeechPermissionResult> {
    return Native.getPermissionStatus();
  },

  async requestPermissions(): Promise<SpeechPermissionResult> {
    // Android: the runtime prompt has to come from the JS side (the native
    // module has no Activity-bound permission flow), so drive it here.
    if (Platform.OS === 'android') {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone access',
          message: 'AI Life Assistant needs the microphone to transcribe your voice.',
          buttonPositive: 'OK',
          buttonNegative: 'Not now',
        }
      );
      const granted = result === PermissionsAndroid.RESULTS.GRANTED;
      return { speech: 'granted', microphone: granted ? 'granted' : 'denied', granted };
    }
    return Native.requestPermissions();
  },

  isAvailable(locale = 'en-US'): Promise<SpeechAvailability> {
    return Native.isAvailable(locale);
  },

  start(options: StartSpeechOptions = {}) {
    return Native.start({
      locale: 'en-US',
      partialResults: true,
      onDevice: false,
      ...options,
    });
  },

  stop() {
    return Native.stop();
  },

  cancel() {
    return Native.cancel();
  },
};
