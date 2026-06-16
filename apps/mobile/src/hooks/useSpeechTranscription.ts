/**
 * useSpeechTranscription
 *
 * Drop-in hook for any screen that needs voice-to-text. Built on the custom
 * native `AILSpeech` module — designed to replace `@react-native-voice/voice`
 * for use cases where we need finer control (contextual biasing, on-device
 * mode, audio-level metering).
 *
 * Design:
 *   - Internal state is held in refs where it shouldn't trigger re-renders
 *     (volume updates would otherwise re-render at audio rate).
 *   - `volume` is exposed as a ref so consumers can attach Reanimated values
 *     without React re-rendering 50× per second.
 *   - All subscriptions are torn down in the effect cleanup; nothing leaks
 *     across hook unmounts (verified with the LeakDetector in dev).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  AILSpeech,
  addSpeechListeners,
  type SpeechErrorCode,
  type SpeechState,
  type StartSpeechOptions,
} from '@native/speech';

interface UseSpeechTranscriptionOptions extends StartSpeechOptions {
  /** If true, automatically request permissions on first `start()`. */
  autoRequestPermissions?: boolean;
  /**
   * Fired once per session when the native module finalises (VAD auto-stop,
   * manual stop, or recognizer final). `audioPath` is present when recording
   * was enabled — the caller uses it to run server-side Whisper transcription.
   */
  onFinal?: (payload: { text: string; audioPath?: string }) => void;
}

interface UseSpeechTranscriptionReturn {
  /** Cumulative text so far (partial + last final). */
  transcript: string;
  /** Engine state — drives UI affordances (mic pulse, stop button). */
  state: SpeechState;
  /** Last error, cleared on next successful `start()`. */
  error: { code: SpeechErrorCode; message: string } | null;
  /** Live RMS level 0–1; ref so it doesn't re-render the tree. */
  volumeRef: React.MutableRefObject<number>;
  start: (override?: StartSpeechOptions) => Promise<void>;
  stop: () => Promise<void>;
  cancel: () => Promise<void>;
  reset: () => void;
}

export function useSpeechTranscription(
  opts: UseSpeechTranscriptionOptions = {},
): UseSpeechTranscriptionReturn {
  const [transcript, setTranscript] = useState('');
  const [state, setState] = useState<SpeechState>('idle');
  const [error, setError] = useState<UseSpeechTranscriptionReturn['error']>(null);
  const volumeRef = useRef(0);

  // Keep latest options in a ref so the subscription effect can stay stable.
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (!AILSpeech.isSupported) return;

    const teardown = addSpeechListeners({
      'AILSpeech.partial': ({ text }) => setTranscript(text),
      'AILSpeech.final': ({ text, audioPath }) => {
        if (text) setTranscript(text);
        optsRef.current.onFinal?.({ text, audioPath });
      },
      'AILSpeech.state': ({ state: s }) => setState(s),
      'AILSpeech.volume': ({ level }) => {
        volumeRef.current = level;
      },
      'AILSpeech.error': (e) => {
        setError({ code: e.code, message: e.message });
        setState('idle');
      },
      'AILSpeech.availability': () => {
        // Hook is intentionally quiet about availability — host UI can read
        // `AILSpeech.isAvailable()` directly when it matters.
      },
    });

    return () => {
      teardown();
      // Defensive: cancel any in-flight session if the consumer unmounts mid-stream.
      AILSpeech.cancel().catch(() => {});
    };
  }, []);

  const start = useCallback(async (override?: StartSpeechOptions) => {
    if (!AILSpeech.isSupported) {
      setError({
        code: 'E_RECOGNIZER_UNAVAILABLE',
        message:
          'Speech module not found in this build. Rebuild the app natively ' +
          '(run-android / run-ios) — a JS reload is not enough after adding a native module.',
      });
      return;
    }
    setError(null);
    setTranscript('');

    if (optsRef.current.autoRequestPermissions) {
      const perm = await AILSpeech.requestPermissions();
      if (!perm.granted) {
        setError({ code: 'E_PERMISSION_DENIED', message: 'Microphone or speech permission denied.' });
        return;
      }
    }

    try {
      await AILSpeech.start({ ...optsRef.current, ...override });
    } catch (e: any) {
      setError({
        code: (e?.code as SpeechErrorCode) ?? 'E_RECOGNITION_FAILED',
        message: e?.message ?? 'Failed to start transcription.',
      });
    }
  }, []);

  const stop = useCallback(async () => {
    try { await AILSpeech.stop(); } catch { /* ignore — race with `final` */ }
  }, []);

  const cancel = useCallback(async () => {
    try { await AILSpeech.cancel(); } catch { /* ignore */ }
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return { transcript, state, error, volumeRef, start, stop, cancel, reset };
}
