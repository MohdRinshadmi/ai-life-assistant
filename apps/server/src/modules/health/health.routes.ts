import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../../infrastructure/database';
import { checkRedisHealth } from '../../infrastructure/redis';
import { sendSuccess } from '../../shared/utils/response';

/**
 * Health Check Controller
 *
 * Three levels of health checks:
 * 1. /health/live  — Is the process running? (Kubernetes liveness probe)
 * 2. /health/ready — Can it serve traffic? (Kubernetes readiness probe)
 * 3. /health       — Detailed health with dependency status
 *
 * Why separate liveness and readiness?
 * - Liveness: If this fails, Kubernetes restarts the container
 * - Readiness: If this fails, Kubernetes stops routing traffic (but doesn't restart)
 * - Example: DB is down → readiness fails (stop traffic) but liveness passes (don't restart)
 */
const router = Router();

// Simple liveness — is the process alive?
router.get('/live', (_req: Request, res: Response) => {
  sendSuccess(res, { status: 'alive' });
});

// Readiness — can we serve requests?
router.get('/ready', async (_req: Request, res: Response) => {
  const [dbHealthy, redisHealthy] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
  ]);

  if (dbHealthy && redisHealthy) {
    sendSuccess(res, { status: 'ready' });
  } else {
    res.status(503).json({
      success: false,
      data: {
        status: 'not_ready',
        database: dbHealthy ? 'up' : 'down',
        redis: redisHealthy ? 'up' : 'down',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Detailed health — full dependency status
router.get('/', async (_req: Request, res: Response) => {
  const startTime = Date.now();

  const [dbHealthy, redisHealthy] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
  ]);

  const responseTimeMs = Date.now() - startTime;
  const allHealthy = dbHealthy && redisHealthy;

  const healthData = {
    status: allHealthy ? 'healthy' : 'degraded',
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor(process.uptime()),
    responseTimeMs,
    dependencies: {
      database: {
        status: dbHealthy ? 'up' : 'down',
      },
      redis: {
        status: redisHealthy ? 'up' : 'down',
      },
    },
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
  };

  const statusCode = allHealthy ? 200 : 503;
  res.status(statusCode).json({
    success: allHealthy,
    data: healthData,
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRoutes };
