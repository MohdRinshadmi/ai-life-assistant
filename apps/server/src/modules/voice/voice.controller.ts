import { Request, Response, NextFunction } from 'express';
import { config, logger } from '@config';
import { BadRequestError } from '@shared/errors';
import { sendSuccess } from '@shared/utils/response';
import {
  isGroqConfigured,
  transcribeAudio,
  synthesizeSpeech,
  TTS_VOICES,
  TTSVoice,
} from '@shared/services/groq.service';

/**
 * Voice Controller
 *
 * Two endpoints, both backed by Groq:
 *
 * POST /voice/transcribe  — audio file → Whisper (on Groq LPUs) → text
 *   Why server-side Whisper over on-device STT?
 *   - Works across all languages and accents without per-device model downloads
 *   - Handles background noise better than mobile OS speech recognition
 *   - Single model version — no fragmentation across iOS/Android versions
 *
 * POST /voice/synthesize  — text → Orpheus TTS → base64 WAV
 *   Why hosted TTS over native TTS?
 *   - Consistent voice quality across all devices
 *   - No robotic system voices — sounds human, supports [cheerful]-style
 *     vocal directions in the text
 *   - Six voice options (autumn, diana, hannah, austin, daniel, troy)
 */
export const voiceController = {
  async transcribe(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) throw new BadRequestError('Audio file is required');

      if (!isGroqConfigured()) {
        throw new BadRequestError('Groq API key is not configured');
      }

      logger.info({
        msg: 'Transcribing audio',
        userId: req.user!.userId,
        sizeBytes: file.size,
        mimeType: file.mimetype,
      });

      const transcript = await transcribeAudio(
        file.buffer,
        file.originalname || 'audio.m4a',
        file.mimetype || 'audio/m4a'
      );

      sendSuccess(res, { transcript });
    } catch (error) {
      next(error);
    }
  },

  async synthesize(req: Request, res: Response, next: NextFunction) {
    try {
      const { text, voice } = req.body as { text: string; voice?: string };

      if (!text?.trim()) throw new BadRequestError('text is required');
      if (text.length > 4096) throw new BadRequestError('text must be under 4096 characters');

      if (!isGroqConfigured()) {
        throw new BadRequestError('Groq API key is not configured');
      }

      const safeVoice: TTSVoice = (TTS_VOICES as readonly string[]).includes(voice ?? '')
        ? (voice as TTSVoice)
        : (config.ai.groq.ttsVoice as TTSVoice);

      const wav = await synthesizeSpeech(text, safeVoice);

      // Return base64 so mobile can play without streaming complexity.
      // Orpheus outputs WAV only (larger than MP3) — for long audio,
      // revisit with chunked transfer or on-the-fly transcoding.
      sendSuccess(res, {
        audio: wav.toString('base64'),
        mimeType: 'audio/wav',
        voice: safeVoice,
      });
    } catch (error) {
      next(error);
    }
  },
};
