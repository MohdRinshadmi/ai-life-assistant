/**
 * useSpeech (chat feature)
 *
 * Owns the full voice round-trip for the chat screen:
 *
 *   mic → custom AILSpeech native module (records audio + runs VAD) →
 *   on stop (manual or VAD-detected silence) the recorded file is uploaded to
 *   the backend Whisper endpoint → the resulting transcript is delivered via
 *   `onTranscript`.
 *
 * On iOS the native module also streams live partial transcripts (SFSpeech)
 * which drive `transcript` for an instant preview; the authoritative text
 * always comes from Whisper. On Android there are no partials — `transcript`
 * stays empty until Whisper returns.
 *
 * TTS (output) still uses `react-native-tts`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EmitterSubscription } from 'react-native';
import Tts from 'react-native-tts';

import { useSpeechTranscription } from '@hooks/useSpeechTranscription';
import { transcribeAudio } from '@services/voice/voiceService';

interface UseSpeechOptions {
  /** Called with the final (Whisper) transcript once an utterance completes. */
  onTranscript?: (text: string) => void;
}

interface UseSpeechReturn {
  isListening: boolean;
  /** True while the recorded clip is being transcribed by Whisper. */
  isTranscribing: boolean;
  isSpeaking: boolean;
  transcript: string;
  speechError: string | null;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  speak: (text: string) => void;
  cancelSpeech: () => void;
  clearTranscript: () => void;
}

export function useSpeech({ onTranscript }: UseSpeechOptions = {}): UseSpeechReturn {
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Finalised utterance → Whisper → deliver transcript. Stable identity so the
  // transcription hook's subscription doesn't churn.
  const handleFinal = useCallback(
    async ({ text, audioPath }: { text: string; audioPath?: string }) => {
      let finalText = text?.trim() ?? '';

      if (audioPath) {
        setIsTranscribing(true);
        try {
          const whisper = await transcribeAudio(audioPath);
          if (whisper?.trim()) finalText = whisper.trim();
        } catch {
          // Whisper unreachable/unconfigured → fall back to the native
          // transcript (non-empty on iOS, empty on Android).
        } finally {
          setIsTranscribing(false);
        }
      }

      if (finalText) onTranscriptRef.current?.(finalText);
    },
    []
  );

  const {
    transcript,
    state,
    error,
    start,
    stop,
    reset,
  } = useSpeechTranscription({
    autoRequestPermissions: true,
    locale: 'en-US',
    record: true, // capture audio for Whisper
    vad: true, // auto-stop when the user falls silent
    silenceTimeoutMs: 1500,
    onFinal: handleFinal,
  });

  useEffect(() => {
    // react-native-tts@4.1.1's removeEventListener calls the long-removed
    // NativeEventEmitter.removeListener (gone in RN 0.85) → "undefined is not a
    // function" on cleanup. addEventListener returns the EmitterSubscription, so
    // keep those and tear down via .remove() instead.
    // Cast: the lib types addEventListener as returning void, but at runtime it
    // returns the EmitterSubscription from NativeEventEmitter.addListener.
    const subs = [
      Tts.addEventListener('tts-start', () => setIsSpeaking(true)),
      Tts.addEventListener('tts-finish', () => setIsSpeaking(false)),
      Tts.addEventListener('tts-cancel', () => setIsSpeaking(false)),
    ] as unknown as EmitterSubscription[];
    return () => {
      subs.forEach((s) => s?.remove?.());
    };
  }, []);

  const speak = useCallback((text: string) => {
    Tts.stop();
    const plain = text.replace(/[*_`#>~\[\]]/g, '').replace(/\n+/g, ' ').trim();
    Tts.speak(plain);
  }, []);

  const cancelSpeech = useCallback(() => {
    Tts.stop();
    setIsSpeaking(false);
  }, []);

  const startListening = useCallback(async () => {
    await start();
  }, [start]);

  return {
    isListening: state === 'listening',
    isTranscribing,
    isSpeaking,
    transcript,
    speechError: error?.message ?? null,
    startListening,
    stopListening: stop,
    speak,
    cancelSpeech,
    clearTranscript: reset,
  };
}
