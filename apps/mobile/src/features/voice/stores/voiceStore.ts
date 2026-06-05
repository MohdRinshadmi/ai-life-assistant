import { create } from 'zustand';

/**
 * Voice Store — Zustand
 *
 * Holds the last command captured on the hands-free Voice screen so other
 * surfaces (e.g. the Chat route consuming `onComplete`) can pick it up after
 * navigation without prop-drilling. Intentionally tiny: capture UX only.
 */
interface VoiceState {
  /** The most recent confirmed transcript, or null if none yet. */
  lastTranscript: string | null;
  setLastTranscript: (text: string) => void;
  clear: () => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  lastTranscript: null,
  setLastTranscript: (lastTranscript) => set({ lastTranscript }),
  clear: () => set({ lastTranscript: null }),
}));
