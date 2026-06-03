import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { config } from '@config';
import { requestLogger, errorHandler } from '@middleware';
import { redis } from '@infrastructure/redis';
import { healthRoutes } from '@modules/health/health.routes';
import { authRoutes } from '@modules/auth/auth.routes';
import { chatRoutes } from '@modules/chat/chat.routes';
import { knowledgeRoutes } from '@modules/knowledge/knowledge.routes';
import { voiceRoutes } from '@modules/voice/voice.routes';
import { taskRoutes } from '@modules/tasks/tasks.routes';

/**
 * Express Application Factory
 *
 * Middleware ordering matters:
 * 1. Security headers (helmet) — first line of defense
 * 2. CORS — reject unauthorized origins early
 * 3. Compression — before body parsing
 * 4. Body parsing — after compression
 * 5. Request logging — after parsing so we can log parsed data
 * 6. Rate limiting — before route handlers
 * 7. Routes — business logic
 * 8. Error handler — MUST be last (catches everything above)
 */
export function createApp() {
  const app = express();

  // ── Security ──────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: config.server.isProd ? undefined : false,
  }));

  app.use(cors({
    origin: config.cors.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    maxAge: 86400, // 24h preflight cache
  }));

  // ── Parsing & Compression ────────────────────────
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── Observability ─────────────────────────────────
  app.use(requestLogger);

  // ── Rate Limiting (Redis-backed — works across multiple instances) ──
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later',
      },
    },
    // Fail open: if Redis is unreachable the store call rejects, and express-rate-limit
    // lets the request through instead of surfacing the error. A Redis outage should
    // degrade rate limiting, not take down the API. Without this the rejected store
    // promise becomes an unhandledRejection → process.exit(1) (see server.ts).
    passOnStoreError: true,
    store: new RedisStore({
      // rate-limit-redis v4 accepts a sendCommand callback — decoupled from any specific Redis client
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sendCommand: (...args: string[]) => redis.call(...(args as [string, ...string[]])) as any,
    }),
  });
  app.use(limiter);

  // ── Trust proxy (required behind load balancers) ──
  app.set('trust proxy', 1);

  // ── Routes ────────────────────────────────────────
  app.use('/health', healthRoutes);

  const apiRouter = express.Router();
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/chat/conversations', chatRoutes);
  apiRouter.use('/knowledge', knowledgeRoutes);
  apiRouter.use('/voice', voiceRoutes);
  apiRouter.use('/tasks', taskRoutes);
  app.use(config.server.apiPrefix, apiRouter);

  // ── 404 Handler ───────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested endpoint does not exist',
      },
      timestamp: new Date().toISOString(),
    });
  });

  // ── Global Error Handler (MUST be last) ───────────
  app.use(errorHandler);

  return app;
}
