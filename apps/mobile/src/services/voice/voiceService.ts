import { apiClient } from '@services/api/client';

/**
 * voiceService — speech endpoints backed by the server's Groq pipeline.
 *
 * `transcribeAudio` uploads a recorded clip (captured natively by the custom
 * AILSpeech module) to `POST /voice/transcribe`, where it is transcribed by
 * Whisper (whisper-large-v3-turbo on Groq). This is the authoritative
 * transcription step in the voice flow — on-device recognition, where it
 * exists (iOS SFSpeech), is only used for the live partial preview.
 */
interface ApiWrapper<T> {
  success: boolean;
  data: T;
}

/**
 * Upload a recorded audio file and return its Whisper transcript.
 *
 * @param audioPath  Local file URI from the `final` event's `audioPath`
 *                   (e.g. "file:///…/ail-rec-xyz.wav" on iOS,
 *                   "file:///…/ail-rec-xyz.m4a" on Android).
 */
export async function transcribeAudio(audioPath: string): Promise<string> {
  const isWav = audioPath.toLowerCase().endsWith('.wav');

  const form = new FormData();
  form.append('audio', {
    uri: audioPath,
    // The extension matters: Whisper detects the container from the filename,
    // and the server's multer filter only accepts known audio mime types.
    name: isWav ? 'audio.wav' : 'audio.m4a',
    type: isWav ? 'audio/wav' : 'audio/m4a',
    // RN's FormData file shape isn't in axios' type for the web FormData.
  } as unknown as Blob);

  const { data } = await apiClient.post<ApiWrapper<{ transcript: string }>>(
    '/voice/transcribe',
    form,
    {
      // RN's networking layer fills in the multipart boundary for us; we only
      // need to flip the type away from the client's default application/json.
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );

  return data.data.transcript;
}
