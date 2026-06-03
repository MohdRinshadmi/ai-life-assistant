import { Request, Response, NextFunction } from 'express';
import OpenAI, { toFile } from 'openai';
import { config, logger } from '@config';
import { ValidationError, BadRequestError } from '@shared/errors';
import { sendSuccess } from '@shared/utils/response';

const openai = new OpenAI({ apiKey: config.ai.openai.apiKey });

/**
 * Voice Controller
 *
 * Two endpoints:
 *
 * POST /voice/transcribe  — audio file → Whisper → text
 *   Why Whisper over on-device STT?
 *   - Works across all languages and accents without per-device model downloads
 *   - Handles background noise better than mobile OS speech recognition
 *   - Single model version — no fragmentation across iOS/Android versions
 *
 * POST /voice/synthesize  — text → OpenAI TTS → base64 MP3
 *   Why OpenAI TTS over native TTS?
 *   - Consistent voice quality across all devices
 *   - No robotic system voices — sounds human
 *   - Multiple voice options (alloy, echo, nova, shimmer, etc.)
 */
export const voiceController = {
  async transcribe(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) throw new BadRequestError('Audio file is required');

      if (!config.ai.openai.apiKey) {
        throw new BadRequestError('OpenAI API key is not configured');
      }

      logger.info({
        msg: 'Transcribing audio',
        userId: req.user!.userId,
        sizeBytes: file.size,
        mimeType: file.mimetype,
      });

      // Convert the buffer from multer to the File-like object OpenAI expects.
      // The filename extension matters — Whisper uses it to detect format.
      const audioFile = await toFile(file.buffer, file.originalname || 'audio.m4a', {
        type: file.mimetype || 'audio/m4a',
      });

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en', // omit for auto-detect; specifying cuts latency ~200ms
      });

      sendSuccess(res, { transcript: transcription.text });
    } catch (error) {
      next(error);
    }
  },

  async synthesize(req: Request, res: Response, next: NextFunction) {
    try {
      const { text, voice = 'nova' } = req.body as { text: string; voice?: string };

      if (!text?.trim()) throw new BadRequestError('text is required');
      if (text.length > 4096) throw new BadRequestError('text must be under 4096 characters');

      if (!config.ai.openai.apiKey) {
        throw new BadRequestError('OpenAI API key is not configured');
      }

      const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
      const safeVoice = validVoices.includes(voice) ? voice : 'nova';

      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',         // tts-1-hd for higher quality (2× cost, ~250ms more latency)
        voice: safeVoice as 'nova',
        input: text,
        response_format: 'mp3',
      });

      // Return base64 so mobile can play without streaming complexity.
      // For audio > 30s, switch to streaming response_format + chunked transfer.
      const buffer = Buffer.from(await mp3.arrayBuffer());
      const base64Audio = buffer.toString('base64');

      sendSuccess(res, { audio: base64Audio, mimeType: 'audio/mpeg', voice: safeVoice });
    } catch (error) {
      next(error);
    }
  },
};
