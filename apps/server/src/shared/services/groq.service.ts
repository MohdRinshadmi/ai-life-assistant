import Groq, { toFile } from 'groq-sdk';
import { config, logger } from '@config';

/**
 * Groq Service — the single owner of the Groq API key.
 *
 * Groq handles the voice pipeline:
 * - STT: whisper-large-v3-turbo — same Whisper quality as OpenAI's hosted
 *   endpoint, but served on Groq's LPUs (~10× faster, $0.04/audio-hour)
 * - TTS: canopylabs/orpheus-v1-english — expressive voices, WAV output
 *
 * Lazy singleton for the same reason as gemini.service: GROQ_API_KEY is
 * optional, so the server must boot (and non-voice features must work)
 * without it.
 */
let client: Groq | null = null;

function getClient(): Groq {
  if (!config.ai.groq.apiKey) {
    throw new Error('GROQ_API_KEY is required for voice features');
  }
  if (!client) {
    client = new Groq({ apiKey: config.ai.groq.apiKey });
  }
  return client;
}

export function isGroqConfigured(): boolean {
  return Boolean(config.ai.groq.apiKey);
}

// ── Speech-to-Text ──────────────────────────────────────────

/**
 * Transcribe an audio buffer to text.
 * Accepts flac/mp3/mp4/m4a/ogg/wav/webm; 25MB max on the free tier
 * (enforced upstream by multer in voice.routes).
 */
export async function transcribeAudio(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const groq = getClient();

  // Convert the raw buffer to the File-like object the SDK expects.
  // The filename extension matters — Whisper uses it to detect format.
  const file = await toFile(buffer, filename, { type: mimeType });

  const transcription = await groq.audio.transcriptions.create({
    file,
    model: config.ai.groq.sttModel,
    language: 'en', // omit for auto-detect; specifying cuts latency
  });

  return transcription.text;
}

// ── Text-to-Speech ──────────────────────────────────────────

export const TTS_VOICES = ['autumn', 'diana', 'hannah', 'austin', 'daniel', 'troy'] as const;
export type TTSVoice = (typeof TTS_VOICES)[number];

/**
 * Orpheus hard-caps input at 200 characters per request, so longer text
 * must be split and synthesized in pieces, then stitched back together.
 */
const TTS_MAX_CHARS = 200;

/**
 * Split text into chunks of at most maxLen characters, preferring sentence
 * boundaries, then word boundaries. Splitting mid-word is a last resort
 * (pathological inputs like a 300-char URL).
 *
 * Boundary choice matters for audio quality: a chunk break becomes a small
 * prosody reset in the stitched output, which sounds natural between
 * sentences but jarring mid-phrase.
 */
function chunkText(text: string, maxLen: number): string[] {
  const sentences = text.match(/[^.!?\n]+[.!?\n]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let current = '';

  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };

  for (const sentence of sentences) {
    if ((current + sentence).length <= maxLen) {
      current += sentence;
      continue;
    }
    flush();

    if (sentence.length <= maxLen) {
      current = sentence;
      continue;
    }

    // Single sentence longer than the cap: split on words
    for (const word of sentence.split(/\s+/)) {
      if (word.length > maxLen) {
        flush();
        for (let i = 0; i < word.length; i += maxLen) {
          chunks.push(word.slice(i, i + maxLen));
        }
      } else if ((current ? current.length + 1 : 0) + word.length > maxLen) {
        flush();
        current = word;
      } else {
        current = current ? `${current} ${word}` : word;
      }
    }
    current += ' ';
  }

  flush();
  return chunks;
}

/**
 * Locate the 'data' chunk inside a RIFF/WAV buffer.
 * WAV files are a sequence of chunks after the 12-byte RIFF header;
 * 'fmt ' and 'data' are the ones that matter, but others (e.g. 'LIST')
 * can appear in between — so walk the chunk list rather than assuming
 * the payload starts at byte 44.
 */
function findWavData(buf: Buffer): { start: number; size: number } {
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const declared = buf.readUInt32LE(offset + 4);
    const start = offset + 8;
    // Clamp: streamed WAVs sometimes declare a placeholder size
    const size = Math.min(declared, buf.length - start);
    if (id === 'data') return { start, size };
    offset = start + size + (size % 2); // chunks are 2-byte aligned
  }
  throw new Error('Invalid WAV: no data chunk found');
}

/**
 * Concatenate WAV buffers that share the same format (sample rate, bit
 * depth, channels) — true here since all come from the same TTS model.
 * Keeps the first file's header, appends every file's PCM payload, then
 * patches the two size fields (RIFF total + data length).
 */
function concatWavBuffers(buffers: Buffer[]): Buffer {
  const first = findWavData(buffers[0]);
  const header = buffers[0].subarray(0, first.start);

  const payloads = buffers.map((b) => {
    const { start, size } = findWavData(b);
    return b.subarray(start, start + size);
  });

  const out = Buffer.concat([header, ...payloads]);
  const dataSize = out.length - header.length;
  out.writeUInt32LE(out.length - 8, 4); // RIFF chunk size = file size - 8
  out.writeUInt32LE(dataSize, first.start - 4); // 'data' chunk size

  return out;
}

/**
 * Synthesize speech from text. Returns a single WAV buffer.
 *
 * Chunks are synthesized in parallel (Promise.all preserves order), so
 * latency is roughly one TTS round-trip regardless of text length, not
 * one per chunk. A 4096-char input is at most ~21 concurrent requests —
 * well within Groq rate limits.
 */
export async function synthesizeSpeech(text: string, voice: TTSVoice): Promise<Buffer> {
  const groq = getClient();
  const chunks = chunkText(text, TTS_MAX_CHARS);

  logger.debug({ msg: 'Synthesizing speech', chunks: chunks.length, voice });

  const wavs = await Promise.all(
    chunks.map(async (chunk) => {
      const response = await groq.audio.speech.create({
        model: config.ai.groq.ttsModel,
        voice,
        input: chunk,
        response_format: 'wav', // the only format Orpheus supports
      });
      return Buffer.from(await response.arrayBuffer());
    })
  );

  return wavs.length === 1 ? wavs[0] : concatWavBuffers(wavs);
}
