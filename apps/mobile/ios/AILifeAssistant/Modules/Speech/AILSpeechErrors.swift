import Foundation

/// Typed error domain for the AILSpeech module.
///
/// We use a dedicated enum (not raw strings) so:
///  - Swift call sites are exhaustive-switched.
///  - JS receives a stable `code` string for i18n + analytics.
///  - We never leak NSError descriptions that might change between iOS versions.
enum AILSpeechError: String, Error {
    case permissionDenied            = "E_PERMISSION_DENIED"
    case permissionRestricted        = "E_PERMISSION_RESTRICTED"
    case recognizerUnavailable       = "E_RECOGNIZER_UNAVAILABLE"
    case localeNotSupported          = "E_LOCALE_NOT_SUPPORTED"
    case audioEngineFailure          = "E_AUDIO_ENGINE_FAILURE"
    case audioSessionFailure         = "E_AUDIO_SESSION_FAILURE"
    case alreadyRunning              = "E_ALREADY_RUNNING"
    case notRunning                  = "E_NOT_RUNNING"
    case recognitionFailed           = "E_RECOGNITION_FAILED"
    case cancelled                   = "E_CANCELLED"

    var message: String {
        switch self {
        case .permissionDenied:      return "User denied speech or microphone permission."
        case .permissionRestricted:  return "Speech or microphone access is restricted on this device."
        case .recognizerUnavailable: return "Speech recognizer is not available right now."
        case .localeNotSupported:    return "Requested locale is not supported on this device."
        case .audioEngineFailure:    return "Failed to start the audio engine."
        case .audioSessionFailure:   return "Failed to configure the audio session."
        case .alreadyRunning:        return "A transcription session is already running."
        case .notRunning:            return "No active transcription session to stop."
        case .recognitionFailed:     return "Speech recognition failed mid-session."
        case .cancelled:             return "Session was cancelled."
        }
    }
}
