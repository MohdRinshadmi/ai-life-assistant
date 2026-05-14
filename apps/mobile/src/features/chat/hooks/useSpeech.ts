import { useState, useEffect, useCallback } from 'react';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';
import Tts from 'react-native-tts';

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
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);

  useEffect(() => {
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value?.[0]) setTranscript(e.value[0]);
    };
    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      setSpeechError(e.error?.message ?? 'Speech recognition failed');
      setIsListening(false);
    };
    Voice.onSpeechEnd = () => setIsListening(false);

    const onStart = () => setIsSpeaking(true);
    const onFinish = () => setIsSpeaking(false);
    const onCancel = () => setIsSpeaking(false);
    Tts.addEventListener('tts-start', onStart);
    Tts.addEventListener('tts-finish', onFinish);
    Tts.addEventListener('tts-cancel', onCancel);

    return () => {
      void Voice.destroy().then(() => Voice.removeAllListeners());
      Tts.removeEventListener('tts-start', onStart);
      Tts.removeEventListener('tts-finish', onFinish);
      Tts.removeEventListener('tts-cancel', onCancel);
    };
  }, []);

  const startListening = useCallback(async () => {
    try {
      setSpeechError(null);
      setTranscript('');
      await Voice.start('en-US');
      setIsListening(true);
    } catch {
      setSpeechError('Failed to start voice recognition');
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      await Voice.stop();
    } catch { /* ignore */ }
    setIsListening(false);
  }, []);

  const speak = useCallback((text: string) => {
    Tts.stop();
    // Strip markdown characters for cleaner TTS output
    const plain = text.replace(/[*_`#>~\[\]]/g, '').replace(/\n+/g, ' ').trim();
    Tts.speak(plain);
  }, []);

  const cancelSpeech = useCallback(() => {
    Tts.stop();
    setIsSpeaking(false);
  }, []);

  const clearTranscript = useCallback(() => setTranscript(''), []);

  return {
    isListening,
    isSpeaking,
    transcript,
    speechError,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
    clearTranscript,
  };
}
