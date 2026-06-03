/**
 * useSpeech (chat feature)
 *
 * Public shape kept intact for ChatScreen — internally now driven by the
 * custom `AILSpeech` native module instead of `@react-native-voice/voice`.
 * TTS (output) still uses `react-native-tts`; only the recognizer was
 * rewritten natively.
 */
import { useCallback, useEffect, useState } from 'react';
import Tts from 'react-native-tts';

import { useSpeechTranscription } from '@hooks/useSpeechTranscription';

interface UseSpeechReturn {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  speechError: string | null;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  speak: (text: string) => void;
  cancelSpeech: () => void;
  clearTranscript: () => void;
}

export function useSpeech(): UseSpeechReturn {
  const {
    transcript,
    state,
    error,
    start,
    stop,
    reset,
  } = useSpeechTranscription({ autoRequestPermissions: true, locale: 'en-US' });

  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const onStart = () => setIsSpeaking(true);
    const onFinish = () => setIsSpeaking(false);
    const onCancel = () => setIsSpeaking(false);
    Tts.addEventListener('tts-start', onStart);
    Tts.addEventListener('tts-finish', onFinish);
    Tts.addEventListener('tts-cancel', onCancel);
    return () => {
      Tts.removeEventListener('tts-start', onStart);
      Tts.removeEventListener('tts-finish', onFinish);
      Tts.removeEventListener('tts-cancel', onCancel);
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

  return {
    isListening: state === 'listening',
    isSpeaking,
    transcript,
    speechError: error?.message ?? null,
    startListening: start,
    stopListening: stop,
    speak,
    cancelSpeech,
    clearTranscript: reset,
  };
}
