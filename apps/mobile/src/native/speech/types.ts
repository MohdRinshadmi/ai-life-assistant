/**
 * Public types for AILSpeech native module.
 *
 * IMPORTANT: keep these in lock-step with:
 *   - Swift `Event` enum in AILSpeech.swift
 *   - Swift `AILSpeechError` raw values in AILSpeechErrors.swift
 *
 * Cross-language drift here is the #1 source of bugs in native modules; the
 * codegen spec (AILSpeechSpec.ts) is what eventually enforces this at build
 * time once we flip to a pure TurboModule.
 */

export type SpeechPermissionStatus =
  | 'granted'
  | 'denied'
  | 'restricted'
  | 'undetermined';

export interface SpeechPermissionResult {
  speech: SpeechPermissionStatus;
  microphone: SpeechPermissionStatus;
  /** True only when BOTH speech and mic are granted. Convenience flag. */
  granted?: boolean;
}

export interface SpeechAvailability {
  /** Locale is at least known to iOS. */
  supported: boolean;
  /** Device can run recognition fully offline for this locale. */
  onDevice: boolean;
  /** Recognizer is reachable right now (server up, network OK if needed). */
  available: boolean;
}

export interface StartSpeechOptions {
  /** BCP-47 locale, e.g. "en-US", "hi-IN". Default "en-US". */
  locale?: string;
  /** Force on-device recognition. Falls through to server if unsupported. */
  onDevice?: boolean;
  /** Emit `partial` events as the user speaks. Default true. */
  partialResults?: boolean;
  /** Domain terms to bias the recognizer toward — names, jargon, products. */
  contextualStrings?: string[];
  /**
   * Record the captured microphone audio to a file so it can be sent to the
   * backend for Whisper transcription. The file path is returned on the
   * `final` event as `audioPath`. On Android this is the ONLY transcription
   * path (no on-device recognizer is used); on iOS it runs alongside the
   * SFSpeech recognizer, whose partials still drive the live UI.
   */
  record?: boolean;
  /**
   * Enable Voice Activity Detection: the module watches the input energy and
   * auto-stops the utterance once the user falls silent for `silenceTimeoutMs`.
   * Default false (caller stops manually).
   */
  vad?: boolean;
  /** Silence gap (ms) that ends an utterance once speech has started. Default 1500. */
  silenceTimeoutMs?: number;
  /** Minimum speech (ms) required before VAD is allowed to end the utterance. Default 300. */
  minSpeechMs?: number;
  /** Hard cap (ms) on a single utterance, regardless of VAD. Default 30000. */
  maxDurationMs?: number;
}

export interface PartialEvent {
  text: string;
  isFinal: false;
}

export interface FinalEvent {
  text: string;
  isFinal: true;
  /**
   * Local file URI of the recorded audio when `record` was enabled, ready to
   * upload to the backend `/voice/transcribe` (Whisper) endpoint. Undefined
   * when recording was off.
   */
  audioPath?: string;
}

export interface VadEvent {
  /** True when VAD detects active speech, false when it detects a silence gap. */
  speaking: boolean;
}

export type SpeechState = 'idle' | 'listening' | 'stopping' | 'backgrounded';

export interface StateEvent {
  state: SpeechState;
}

export interface VolumeEvent {
  /** 0–1 RMS, suitable for waveform UIs. */
  level: number;
}

export interface AvailabilityEvent {
  available: boolean;
}

/** Stable error codes — match `AILSpeechError` enum on the Swift side. */
export type SpeechErrorCode =
  | 'E_PERMISSION_DENIED'
  | 'E_PERMISSION_RESTRICTED'
  | 'E_RECOGNIZER_UNAVAILABLE'
  | 'E_LOCALE_NOT_SUPPORTED'
  | 'E_AUDIO_ENGINE_FAILURE'
  | 'E_AUDIO_SESSION_FAILURE'
  | 'E_ALREADY_RUNNING'
  | 'E_NOT_RUNNING'
  | 'E_RECOGNITION_FAILED'
  | 'E_CANCELLED';

export interface SpeechErrorEvent {
  code: SpeechErrorCode;
  message: string;
}

/** Discriminated union of every event the native module can emit. */
export type SpeechEventMap = {
  'AILSpeech.partial': PartialEvent;
  'AILSpeech.final': FinalEvent;
  'AILSpeech.state': StateEvent;
  'AILSpeech.volume': VolumeEvent;
  'AILSpeech.error': SpeechErrorEvent;
  'AILSpeech.availability': AvailabilityEvent;
};
