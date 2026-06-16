import Foundation
import Speech
import AVFoundation
import QuartzCore
import React

/// AILSpeech
///
/// Production-grade native speech transcription module backing
/// `useSpeechTranscription` on the JS side.
///
/// Threading model
/// ---------------
/// All mutable engine state (`audioEngine`, `recognitionTask`, `request`,
/// `isRunning`) is touched ONLY from `stateQueue` — a dedicated serial
/// DispatchQueue. This gives us actor-like serialization without paying for
/// Swift Concurrency on a module that needs to be Obj-C interop-callable.
/// The audio tap delivers buffers on a private audio thread; we forward them
/// straight into the recognition request without hopping queues to avoid
/// dropping audio. Recognition callbacks are bounced to `stateQueue` before
/// they touch any shared state.
///
/// Event flow (JS ⟵ native)
/// ------------------------
/// Hot data (partial transcripts, audio level, state changes, errors) is
/// pushed via `RCTEventEmitter.sendEvent`. RN only delivers events when JS has
/// at least one listener — we guard with `hasListeners` to avoid wasted work
/// when no one is listening.
///
/// Lifecycle
/// ---------
/// We observe `UIApplication.willResignActiveNotification`. If the app
/// backgrounds mid-session we stop cleanly, emit a state event so JS can
/// reflect it, and release the audio session so other apps regain audio
/// priority.
@objc(AILSpeech)
final class AILSpeech: RCTEventEmitter, SFSpeechRecognizerDelegate {

    // MARK: - Event names (kept in lock-step with TS `SpeechEvent`)
    private enum Event: String, CaseIterable {
        case partial      = "AILSpeech.partial"
        case final        = "AILSpeech.final"
        case state        = "AILSpeech.state"
        case volume       = "AILSpeech.volume"
        case error        = "AILSpeech.error"
        case availability = "AILSpeech.availability"
        case vad          = "AILSpeech.vad"
    }

    // MARK: - State (touched only on stateQueue)
    private let stateQueue = DispatchQueue(label: "ai.life.speech.state", qos: .userInitiated)
    private var audioEngine: AVAudioEngine?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var recognizer: SFSpeechRecognizer?
    private var isRunning = false
    private var hasListeners = false
    private var lastFinalTranscript: String?

    // MARK: - Recording (for server-side Whisper transcription)
    /// When `record` is requested, every captured buffer is also written to this
    /// WAV file. Its path is reported on the `final` event so JS can upload it to
    /// the backend `/voice/transcribe` (Whisper) endpoint.
    private var audioFile: AVAudioFile?
    private var recordingURL: URL?
    /// Guards against emitting more than one `final` per session (SFSpeech final
    /// vs. our recording-fallback final).
    private var didEmitFinal = false

    // MARK: - Voice Activity Detection (touched on the audio thread only)
    private var vadEnabled = false
    private var silenceTimeoutMs = 1500
    private var minSpeechMs = 300
    private var maxDurationMs = 30000
    /// Normalised RMS (0–1) above which a frame counts as speech.
    private var speechThreshold: Float = 0.10
    private var sessionStartTime: CFTimeInterval = 0
    private var lastVoiceTime: CFTimeInterval = 0
    private var hasDetectedSpeech = false
    private var isSpeaking = false
    private var vadStopRequested = false

    // MARK: - RN boilerplate

    /// We must override `init` to register lifecycle observers exactly once.
    override init() {
        super.init()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppWillResignActive),
            name: UIApplication.willResignActiveNotification,
            object: nil
        )
    }

    deinit {
        // Defensive: if module is torn down mid-session, release resources.
        // We don't dispatch to stateQueue here — module deallocation already
        // implies no other references can be calling in.
        cleanupSync(reason: .cancelled)
        NotificationCenter.default.removeObserver(self)
    }

    /// `requiresMainQueueSetup` returning `false` keeps module construction
    /// off the main thread on app launch. Our init does no UIKit work, so
    /// this is safe and avoids contributing to startup jank.
    @objc override static func requiresMainQueueSetup() -> Bool { false }

    /// Run our methods on a background queue by default. Promise-resolving
    /// methods do lightweight work; the heavy lifting happens inside
    /// `stateQueue` and the audio thread.
    override var methodQueue: DispatchQueue { stateQueue }

    override func supportedEvents() -> [String]! {
        Event.allCases.map { $0.rawValue }
    }

    override func startObserving() { hasListeners = true }
    override func stopObserving()  { hasListeners = false }

    // MARK: - Exported API (called via Obj-C bridge file)

    /// Returns current permission status for both microphone and speech.
    /// JS uses this to decide whether to prompt the user with rationale UI.
    @objc(getPermissionStatus:rejecter:)
    func getPermissionStatus(_ resolve: @escaping RCTPromiseResolveBlock,
                             rejecter reject: @escaping RCTPromiseRejectBlock) {
        let speech = SFSpeechRecognizer.authorizationStatus()
        let mic = AVAudioSession.sharedInstance().recordPermission
        resolve([
            "speech": Self.speechAuthString(speech),
            "microphone": Self.micPermString(mic)
        ])
    }

    /// Requests speech + microphone permission, in that order.
    /// Microphone is requested second because some users will deny speech
    /// outright and we shouldn't waste a mic prompt in that case.
    @objc(requestPermissions:rejecter:)
    func requestPermissions(_ resolve: @escaping RCTPromiseResolveBlock,
                            rejecter reject: @escaping RCTPromiseRejectBlock) {
        SFSpeechRecognizer.requestAuthorization { [weak self] speechStatus in
            guard let self = self else { return }
            guard speechStatus == .authorized else {
                resolve([
                    "speech": Self.speechAuthString(speechStatus),
                    "microphone": Self.micPermString(AVAudioSession.sharedInstance().recordPermission),
                    "granted": false
                ])
                return
            }
            AVAudioSession.sharedInstance().requestRecordPermission { micGranted in
                resolve([
                    "speech": Self.speechAuthString(speechStatus),
                    "microphone": micGranted ? "granted" : "denied",
                    "granted": micGranted
                ])
            }
        }
    }

    /// Reports whether on-device recognition is available for `locale`.
    /// Falls back to a server-side recognizer if not — JS can decide whether
    /// to warn the user they'll be sending audio to Apple.
    @objc(isAvailable:resolver:rejecter:)
    func isAvailable(_ locale: String,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let r = SFSpeechRecognizer(locale: Locale(identifier: locale)) else {
            resolve(["supported": false, "onDevice": false, "available": false])
            return
        }
        resolve([
            "supported": true,
            "onDevice": r.supportsOnDeviceRecognition,
            "available": r.isAvailable
        ])
    }

    /// Begin a streaming transcription session.
    ///
    /// - Parameters:
    ///   - options: dict with optional keys:
    ///       - `locale`        (String,  default "en-US")
    ///       - `onDevice`      (Bool,    default false — opt-in to on-device)
    ///       - `partialResults`(Bool,    default true)
    ///       - `contextualStrings` ([String], biases recognizer toward terms)
    @objc(start:resolver:rejecter:)
    func start(_ options: [String: Any],
               resolver resolve: @escaping RCTPromiseResolveBlock,
               rejecter reject: @escaping RCTPromiseRejectBlock) {
        // Already on stateQueue (methodQueue), but be explicit for clarity.
        stateQueue.async { [weak self] in
            guard let self = self else { return }

            if self.isRunning {
                return self.rejectErr(reject, .alreadyRunning)
            }

            // 1. Permission check (synchronous read).
            let speechStatus = SFSpeechRecognizer.authorizationStatus()
            switch speechStatus {
            case .authorized: break
            case .denied:     return self.rejectErr(reject, .permissionDenied)
            case .restricted: return self.rejectErr(reject, .permissionRestricted)
            case .notDetermined: return self.rejectErr(reject, .permissionDenied)
            @unknown default: return self.rejectErr(reject, .permissionDenied)
            }
            if AVAudioSession.sharedInstance().recordPermission != .granted {
                return self.rejectErr(reject, .permissionDenied)
            }

            // 2. Recognizer for requested locale.
            let localeId = (options["locale"] as? String) ?? "en-US"
            guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: localeId)) else {
                return self.rejectErr(reject, .localeNotSupported)
            }
            guard recognizer.isAvailable else {
                return self.rejectErr(reject, .recognizerUnavailable)
            }
            recognizer.delegate = self
            self.recognizer = recognizer

            // 3. Configure audio session for recording. `.measurement` mode
            // disables system audio processing (AGC etc.) which matters for
            // accurate VAD — and `.duckOthers` politely lowers other apps.
            do {
                let session = AVAudioSession.sharedInstance()
                try session.setCategory(.playAndRecord,
                                        mode: .measurement,
                                        options: [.duckOthers, .defaultToSpeaker])
                try session.setActive(true, options: .notifyOthersOnDeactivation)
            } catch {
                return self.rejectErr(reject, .audioSessionFailure)
            }

            // 4. Build streaming recognition request.
            let request = SFSpeechAudioBufferRecognitionRequest()
            request.shouldReportPartialResults = (options["partialResults"] as? Bool) ?? true
            if let strings = options["contextualStrings"] as? [String] {
                request.contextualStrings = strings
            }
            if (options["onDevice"] as? Bool) == true {
                if recognizer.supportsOnDeviceRecognition {
                    request.requiresOnDeviceRecognition = true
                }
                // If caller asked for on-device but device doesn't support it,
                // we fall through to server recognition rather than failing —
                // JS already knows from `isAvailable()` that it might happen.
            }
            self.recognitionRequest = request

            // 5. Audio engine. We always create a fresh instance — reusing
            // engines across sessions has a long history of edge-case bugs
            // (tap reinstall errors, format mismatch after route changes).
            let engine = AVAudioEngine()
            self.audioEngine = engine
            let input = engine.inputNode
            let format = input.outputFormat(forBus: 0)

            // 5a. Optional recording. When enabled we tee the captured buffers
            // into a WAV file (same PCM format as the tap, so no conversion) and
            // hand its path to JS on `final` for server-side Whisper transcription.
            self.didEmitFinal = false
            self.audioFile = nil
            self.recordingURL = nil
            if (options["record"] as? Bool) == true {
                let url = FileManager.default.temporaryDirectory
                    .appendingPathComponent("ail-rec-\(UUID().uuidString).wav")
                do {
                    self.audioFile = try AVAudioFile(forWriting: url, settings: format.settings)
                    self.recordingURL = url
                } catch {
                    // Best-effort: recognition still works without the recording.
                    self.audioFile = nil
                    self.recordingURL = nil
                }
            }

            // 5b. VAD config + state. VAD watches input energy and auto-stops the
            // utterance once the user falls silent — see `runVad`.
            self.vadEnabled = (options["vad"] as? Bool) ?? false
            self.silenceTimeoutMs = (options["silenceTimeoutMs"] as? NSNumber)?.intValue ?? 1500
            self.minSpeechMs = (options["minSpeechMs"] as? NSNumber)?.intValue ?? 300
            self.maxDurationMs = (options["maxDurationMs"] as? NSNumber)?.intValue ?? 30000
            self.hasDetectedSpeech = false
            self.isSpeaking = false
            self.vadStopRequested = false
            self.sessionStartTime = CACurrentMediaTime()
            self.lastVoiceTime = self.sessionStartTime

            // 6. Install tap. Buffer size 1024 ≈ 23ms at 44.1kHz — small
            // enough for snappy partials, large enough not to thrash CPU.
            input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
                // This closure runs on a private audio thread:
                //  - append to recognizer (lock-free internally)
                //  - tee to the recording file (best-effort)
                //  - compute volume / run VAD (no allocations in hot path)
                guard let self = self else { return }
                self.recognitionRequest?.append(buffer)
                if let file = self.audioFile {
                    try? file.write(from: buffer)
                }
                self.processAudioBuffer(buffer)
            }

            engine.prepare()
            do {
                try engine.start()
            } catch {
                self.cleanupSync(reason: .audioEngineFailure)
                return self.rejectErr(reject, .audioEngineFailure)
            }

            // 7. Kick off recognition task. The callback may fire many times
            // for partials; we forward to JS and only finalize on `isFinal`
            // or error.
            self.recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
                guard let self = self else { return }
                self.stateQueue.async {
                    if let result = result {
                        let text = result.bestTranscription.formattedString
                        if result.isFinal {
                            self.lastFinalTranscript = text
                            self.emitFinal(text: text)
                            self.cleanupSync(reason: nil)
                        } else {
                            self.emit(.partial, ["text": text, "isFinal": false])
                        }
                    }
                    if let error = error {
                        // `kAFAssistantErrorDomain` code 216/203 = user-initiated stop. Don't surface as error.
                        let ns = error as NSError
                        let isSilentStop = ns.domain == "kAFAssistantErrorDomain" && (ns.code == 216 || ns.code == 203 || ns.code == 1110)
                        if !isSilentStop {
                            self.emit(.error, ["code": AILSpeechError.recognitionFailed.rawValue,
                                               "message": ns.localizedDescription])
                        }
                        self.cleanupSync(reason: nil)
                    }
                }
            }

            self.isRunning = true
            self.emit(.state, ["state": "listening"])
            resolve(["started": true, "locale": localeId])
        }
    }

    /// Politely stop the session. Sends `endAudio()` so the recognizer can
    /// produce a final result from buffered audio (vs `cancel()` which throws it away).
    @objc(stop:rejecter:)
    func stop(_ resolve: @escaping RCTPromiseResolveBlock,
              rejecter reject: @escaping RCTPromiseRejectBlock) {
        stateQueue.async { [weak self] in
            guard let self = self else { return }
            guard self.isRunning else {
                return self.rejectErr(reject, .notRunning)
            }
            self.audioEngine?.stop()
            self.audioEngine?.inputNode.removeTap(onBus: 0)
            self.recognitionRequest?.endAudio()
            self.isRunning = false
            self.emit(.state, ["state": "stopping"])
            // Don't tear down recognitionTask yet — it still has to emit `isFinal`.
            resolve(["stopped": true])
        }
    }

    /// Abandon the session immediately, no final transcript.
    @objc(cancel:rejecter:)
    func cancel(_ resolve: @escaping RCTPromiseResolveBlock,
                rejecter reject: @escaping RCTPromiseRejectBlock) {
        stateQueue.async { [weak self] in
            self?.cleanupSync(reason: .cancelled)
            resolve(["cancelled": true])
        }
    }

    // MARK: - SFSpeechRecognizerDelegate

    func speechRecognizer(_ speechRecognizer: SFSpeechRecognizer, availabilityDidChange available: Bool) {
        stateQueue.async { [weak self] in
            self?.emit(.availability, ["available": available])
            if !available, self?.isRunning == true {
                self?.cleanupSync(reason: .recognizerUnavailable)
            }
        }
    }

    // MARK: - Lifecycle

    @objc private func handleAppWillResignActive() {
        stateQueue.async { [weak self] in
            guard self?.isRunning == true else { return }
            self?.cleanupSync(reason: .cancelled)
            self?.emit(.state, ["state": "backgrounded"])
        }
    }

    // MARK: - Helpers

    /// Caller must already be on `stateQueue` (or be in a teardown path where
    /// there are no other callers, e.g. deinit). Idempotent.
    private func cleanupSync(reason: AILSpeechError?) {
        if let engine = audioEngine, engine.isRunning {
            engine.stop()
            engine.inputNode.removeTap(onBus: 0)
        }
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()

        audioEngine = nil
        recognitionRequest = nil
        recognitionTask = nil
        isRunning = false

        // Best-effort: release audio session so music etc. can resume.
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)

        if let reason = reason {
            emit(.error, ["code": reason.rawValue, "message": reason.message])
        }

        // Recording recovery: if we were recording and the recognizer never
        // produced a final (e.g. it failed), still surface the audio path so the
        // caller can fall back to server-side Whisper. Skipped on cancel/teardown
        // (reason != nil), where the user abandoned the utterance.
        if reason == nil, !didEmitFinal, recordingURL != nil {
            emitFinal(text: lastFinalTranscript ?? "")
        }

        // Reset recording + VAD state for the next session.
        audioFile = nil
        recordingURL = nil
        vadEnabled = false
        vadStopRequested = false
        hasDetectedSpeech = false
        isSpeaking = false

        emit(.state, ["state": "idle"])
    }

    private func emit(_ event: Event, _ body: [String: Any]) {
        guard hasListeners else { return }
        sendEvent(withName: event.rawValue, body: body)
    }

    /// Compute a normalised 0–1 RMS level for the buffer, emit it as a volume
    /// event (for waveform UIs), and feed it to the VAD. Runs on the audio
    /// thread — keep it cheap and allocation-free in the hot path.
    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer) {
        guard let channelData = buffer.floatChannelData?[0] else { return }
        let frameLength = Int(buffer.frameLength)
        if frameLength == 0 { return }

        // Accumulate sum of squares without ARC overhead.
        var sumSq: Float = 0
        for i in 0..<frameLength {
            let s = channelData[i]
            sumSq += s * s
        }
        let rms = sqrtf(sumSq / Float(frameLength))
        // RMS of speech is roughly 0.01–0.3 in practice; clamp & scale.
        let normalised = min(1, rms * 4)

        if hasListeners {
            sendEvent(withName: Event.volume.rawValue, body: ["level": normalised])
        }

        if vadEnabled && isRunning && !vadStopRequested {
            runVad(level: normalised)
        }
    }

    /// Voice Activity Detection. Tracks the last time energy crossed the speech
    /// threshold; once the user has spoken and then stayed quiet for
    /// `silenceTimeoutMs` (or the utterance hits `maxDurationMs`), it ends the
    /// session — this is what "determines when the user stopped speaking".
    /// Called on the audio thread only; the actual stop hops to `stateQueue`.
    private func runVad(level: Float) {
        let now = CACurrentMediaTime()

        if level >= speechThreshold {
            hasDetectedSpeech = true
            lastVoiceTime = now
            if !isSpeaking {
                isSpeaking = true
                emitVad(true)
            }
        } else if isSpeaking, (now - lastVoiceTime) > 0.2 {
            isSpeaking = false
            emitVad(false)
        }

        let elapsedMs = (now - sessionStartTime) * 1000
        let silenceMs = (now - lastVoiceTime) * 1000
        let endedBySilence = hasDetectedSpeech
            && silenceMs >= Double(silenceTimeoutMs)
            && elapsedMs >= Double(minSpeechMs)
        let endedByMaxDuration = elapsedMs >= Double(maxDurationMs)

        if endedBySilence || endedByMaxDuration {
            vadStopRequested = true
            requestStop()
        }
    }

    private func emitVad(_ speaking: Bool) {
        emit(.vad, ["speaking": speaking])
    }

    /// Gracefully end audio capture (same effect as the public `stop`), used by
    /// the VAD auto-stop path. The recognizer then produces its final result
    /// from the buffered audio.
    private func requestStop() {
        stateQueue.async { [weak self] in
            guard let self = self, self.isRunning else { return }
            self.audioEngine?.stop()
            self.audioEngine?.inputNode.removeTap(onBus: 0)
            self.recognitionRequest?.endAudio()
            self.isRunning = false
            self.emit(.state, ["state": "stopping"])
        }
    }

    /// Emit a single `final` event, attaching the recorded audio path when
    /// present. Idempotent — guards against double-final (recognizer vs. fallback).
    private func emitFinal(text: String) {
        if didEmitFinal { return }
        didEmitFinal = true
        // Flush + close the recording so the on-disk file is complete before JS
        // reads it. (AVAudioFile finalises the header on dealloc.)
        audioFile = nil
        var body: [String: Any] = ["text": text, "isFinal": true]
        if let url = recordingURL {
            body["audioPath"] = url.absoluteString
        }
        emit(.final, body)
    }

    private func rejectErr(_ reject: RCTPromiseRejectBlock, _ err: AILSpeechError) {
        reject(err.rawValue, err.message, NSError(domain: "AILSpeech", code: 0, userInfo: [NSLocalizedDescriptionKey: err.message]))
    }

    private static func speechAuthString(_ s: SFSpeechRecognizerAuthorizationStatus) -> String {
        switch s {
        case .authorized:    return "granted"
        case .denied:        return "denied"
        case .restricted:    return "restricted"
        case .notDetermined: return "undetermined"
        @unknown default:    return "undetermined"
        }
    }

    private static func micPermString(_ s: AVAudioSession.RecordPermission) -> String {
        switch s {
        case .granted:    return "granted"
        case .denied:     return "denied"
        case .undetermined: return "undetermined"
        @unknown default: return "undetermined"
        }
    }
}
