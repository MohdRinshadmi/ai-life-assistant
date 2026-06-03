import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticate, validate } from '@middleware';
import { voiceController } from './voice.controller';

export const voiceRoutes = Router();

voiceRoutes.use(authenticate);

// In-memory storage — file is available as req.file.buffer.
// Max 25MB matches OpenAI Whisper's file size limit.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/wav',
                     'audio/webm', 'audio/ogg', 'audio/flac'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio format: ${file.mimetype}`));
    }
  },
});

voiceRoutes.post('/transcribe', upload.single('audio'), voiceController.transcribe);

voiceRoutes.post(
  '/synthesize',
  validate({
    body: z.object({
      text: z.string().min(1).max(4096),
      voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).optional(),
    }),
  }),
  voiceController.synthesize
);
