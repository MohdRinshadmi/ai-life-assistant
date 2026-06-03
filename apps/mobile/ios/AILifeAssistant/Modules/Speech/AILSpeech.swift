import Foundation
import Speech
import AVFoundation
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

            // 6. Install tap. Buffer size 1024 ≈ 23ms at 44.1kHz — small
            // enough for snappy partials, large enough not to thrash CPU.
            input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
                // This closure runs on a private audio thread. Two things only:
                //  - append to recognizer (lock-free internally)
                //  - compute volume and emit to JS (best-effort, no allocations in hot path)
                self?.recognitionRequest?.append(buffer)
                self?.emitVolume(from: buffer)
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
                            self.emit(.final, ["text": text, "isFinal": true])
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
        emit(.state, ["state": "idle"])
    }

    private func emit(_ event: Event, _ body: [String: Any]) {
        guard hasListeners else { return }
        sendEvent(withName: event.rawValue, body: body)
    }

    /// Compute a normalised 0–1 RMS volume for the supplied buffer.
    /// Useful for waveform UIs. Done on the audio thread — keep it cheap.
    private func emitVolume(from buffer: AVAudioPCMBuffer) {
        guard hasListeners,
              let channelData = buffer.floatChannelData?[0]
        else { return }
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
        // Don't allocate a new dictionary if no listeners — already guarded above.
        sendEvent(withName: Event.volume.rawValue, body: ["level": normalised])
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
