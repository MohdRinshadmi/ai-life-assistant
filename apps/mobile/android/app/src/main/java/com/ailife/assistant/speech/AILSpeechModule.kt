package com.ailife.assistant.speech

import android.Manifest
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File

/**
 * AILSpeech (Android)
 *
 * Kotlin counterpart of the iOS Swift `AILSpeech` module. It implements the
 * SAME JS contract (start/stop/cancel/permissions + the `AILSpeech.*` event
 * stream) so the cross-platform wrapper in `src/native/speech` works unchanged.
 *
 * Unlike iOS — which has the on-device SFSpeech recognizer for live partials —
 * Android has no equally good on-device option, so this module focuses on the
 * job the architecture actually needs: capture microphone audio to a file,
 * run Voice Activity Detection to decide when the user stopped speaking, and
 * hand the recorded file to JS (via the `final` event's `audioPath`) for
 * server-side Whisper transcription. There are therefore no `partial` events
 * on Android — the transcript arrives once, from Whisper.
 *
 * Recording: MediaRecorder → AAC in an MP4/.m4a container (compact, and a
 * format Groq Whisper accepts directly).
 * VAD: poll MediaRecorder.getMaxAmplitude() at ~10 Hz; once speech has been
 * seen and then the level stays below threshold for `silenceTimeoutMs`, the
 * utterance is auto-finalised.
 */
class AILSpeechModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var recorder: MediaRecorder? = null
    private var outputFile: File? = null
    private var isRunning = false

    // VAD config + state
    private var vadEnabled = false
    private var silenceTimeoutMs = 1500L
    private var minSpeechMs = 300L
    private var maxDurationMs = 30000L
    private val speechThreshold = 0.08f
    private var sessionStart = 0L
    private var lastVoiceTime = 0L
    private var hasDetectedSpeech = false
    private var isSpeaking = false

    private val handler = Handler(Looper.getMainLooper())
    private val meterRunnable = object : Runnable {
        override fun run() {
            if (!isRunning) return
            tickMeter()
            handler.postDelayed(this, 100)
        }
    }

    override fun getName() = "AILSpeech"

    // ── Event helpers ──────────────────────────────────────────────────
    private fun emit(event: String, params: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(event, params)
    }

    private fun emitState(state: String) {
        val p = Arguments.createMap()
        p.putString("state", state)
        emit("AILSpeech.state", p)
    }

    // ── Permissions ────────────────────────────────────────────────────
    // The runtime permission PROMPT is driven from JS (PermissionsAndroid);
    // here we only report the current grant status.
    private fun micGranted(): Boolean =
        ContextCompat.checkSelfPermission(reactContext, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED

    @ReactMethod
    fun getPermissionStatus(promise: Promise) {
        val map = Arguments.createMap()
        // No native speech-recognition permission on this path — STT is Whisper.
        map.putString("speech", "granted")
        map.putString("microphone", if (micGranted()) "granted" else "denied")
        promise.resolve(map)
    }

    @ReactMethod
    fun requestPermissions(promise: Promise) {
        val granted = micGranted()
        val map = Arguments.createMap()
        map.putString("speech", "granted")
        map.putString("microphone", if (granted) "granted" else "denied")
        map.putBoolean("granted", granted)
        promise.resolve(map)
    }

    @ReactMethod
    fun isAvailable(locale: String, promise: Promise) {
        val map = Arguments.createMap()
        map.putBoolean("supported", true)
        map.putBoolean("onDevice", false) // transcription is server-side Whisper
        map.putBoolean("available", micGranted())
        promise.resolve(map)
    }

    // ── Session control ────────────────────────────────────────────────
    @ReactMethod
    fun start(options: ReadableMap, promise: Promise) {
        if (isRunning) {
            promise.reject("E_ALREADY_RUNNING", "A transcription session is already running.")
            return
        }
        if (!micGranted()) {
            promise.reject("E_PERMISSION_DENIED", "Microphone permission denied.")
            return
        }

        vadEnabled = options.hasKey("vad") && options.getBoolean("vad")
        silenceTimeoutMs = if (options.hasKey("silenceTimeoutMs")) options.getDouble("silenceTimeoutMs").toLong() else 1500L
        minSpeechMs = if (options.hasKey("minSpeechMs")) options.getDouble("minSpeechMs").toLong() else 300L
        maxDurationMs = if (options.hasKey("maxDurationMs")) options.getDouble("maxDurationMs").toLong() else 30000L

        val file = File(reactContext.cacheDir, "ail-rec-${System.currentTimeMillis()}.m4a")
        val rec = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            MediaRecorder(reactContext)
        } else {
            @Suppress("DEPRECATION")
            MediaRecorder()
        }

        try {
            rec.setAudioSource(MediaRecorder.AudioSource.MIC)
            rec.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            rec.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            rec.setAudioSamplingRate(16000)
            rec.setAudioEncodingBitRate(64000)
            rec.setOutputFile(file.absolutePath)
            rec.prepare()
            rec.start()
        } catch (e: Exception) {
            try { rec.release() } catch (_: Exception) {}
            promise.reject("E_AUDIO_ENGINE_FAILURE", "Failed to start recording: ${e.message}")
            return
        }

        recorder = rec
        outputFile = file
        isRunning = true
        hasDetectedSpeech = false
        isSpeaking = false
        sessionStart = System.currentTimeMillis()
        lastVoiceTime = sessionStart
        handler.postDelayed(meterRunnable, 100)
        emitState("listening")

        val res = Arguments.createMap()
        res.putBoolean("started", true)
        res.putString("locale", if (options.hasKey("locale")) options.getString("locale") else "en-US")
        promise.resolve(res)
    }

    @ReactMethod
    fun stop(promise: Promise) {
        if (!isRunning) {
            promise.reject("E_NOT_RUNNING", "No active transcription session to stop.")
            return
        }
        emitState("stopping")
        finish(emitFinal = true)
        val res = Arguments.createMap()
        res.putBoolean("stopped", true)
        promise.resolve(res)
    }

    @ReactMethod
    fun cancel(promise: Promise) {
        teardown()
        outputFile?.let { try { it.delete() } catch (_: Exception) {} }
        outputFile = null
        emitState("idle")
        val res = Arguments.createMap()
        res.putBoolean("cancelled", true)
        promise.resolve(res)
    }

    // RN's NativeEventEmitter requires these to exist; no bookkeeping needed.
    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Double) {}

    // ── Internals ──────────────────────────────────────────────────────
    private fun tickMeter() {
        val rec = recorder ?: return
        val amp = try { rec.maxAmplitude } catch (e: Exception) { 0 }
        val level = (amp / 32767f).coerceIn(0f, 1f)
        val vol = Arguments.createMap()
        vol.putDouble("level", level.toDouble())
        emit("AILSpeech.volume", vol)
        if (vadEnabled) runVad(level)
    }

    private fun runVad(level: Float) {
        val now = System.currentTimeMillis()
        if (level >= speechThreshold) {
            hasDetectedSpeech = true
            lastVoiceTime = now
            if (!isSpeaking) {
                isSpeaking = true
                val p = Arguments.createMap()
                p.putBoolean("speaking", true)
                emit("AILSpeech.vad", p)
            }
        } else if (isSpeaking && now - lastVoiceTime > 200) {
            isSpeaking = false
            val p = Arguments.createMap()
            p.putBoolean("speaking", false)
            emit("AILSpeech.vad", p)
        }

        val elapsed = now - sessionStart
        val silence = now - lastVoiceTime
        val endedBySilence = hasDetectedSpeech && silence >= silenceTimeoutMs && elapsed >= minSpeechMs
        if (endedBySilence || elapsed >= maxDurationMs) {
            finish(emitFinal = true)
        }
    }

    /** Stop + release the recorder. Returns the recorded file if it exists. */
    private fun teardown(): File? {
        if (!isRunning) return outputFile?.takeIf { it.exists() }
        isRunning = false
        handler.removeCallbacks(meterRunnable)
        val rec = recorder
        recorder = null
        try { rec?.stop() } catch (_: Exception) {}
        try { rec?.release() } catch (_: Exception) {}
        return outputFile?.takeIf { it.exists() }
    }

    private fun finish(emitFinal: Boolean) {
        val file = teardown()
        if (emitFinal && file != null) {
            val p = Arguments.createMap()
            p.putString("text", "") // no on-device transcript; Whisper fills this in
            p.putBoolean("isFinal", true)
            p.putString("audioPath", "file://" + file.absolutePath)
            emit("AILSpeech.final", p)
        }
        emitState("idle")
    }
}
