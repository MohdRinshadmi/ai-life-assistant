import http from 'http';
import { createApp } from './app';
import { config, logger } from './config';
import { closeDatabasePool } from './infrastructure/database';
import { closeRedis } from './infrastructure/redis';
import { createSocketServer } from './infrastructure/socket';
import { registerChatGateway } from './modules/chat/chat.gateway';

/**
 * Server Entry Point
 *
 * Responsibilities:
 * 1. Start the HTTP server
 * 2. Attach Socket.io to the same HTTP server (shared port)
 * 3. Handle graceful shutdown (SIGTERM, SIGINT)
 * 4. Handle uncaught exceptions and unhandled rejections
 *
 * Why attach Socket.io to the HTTP server vs. a separate port?
 * - One port means one load-balancer rule, one TLS cert, one firewall rule
 * - Mobile client only needs one base URL
 * - Socket.io upgrade happens on the same TCP connection as HTTP
 */

const app = createApp();
const httpServer = http.createServer(app);

// Attach Socket.io — MUST happen before httpServer.listen so the
// upgrade handler is registered before any connections arrive
const io = createSocketServer(httpServer);
registerChatGateway(io);

httpServer.listen(config.server.port, () => {
  logger.info({
    msg: '🚀 Server running',
    port: config.server.port,
    env: config.server.nodeEnv,
    apiPrefix: config.server.apiPrefix,
    pid: process.pid,
  });
});

// ── Graceful Shutdown ─────────────────────────────────

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function gracefulShutdown(signal: string) {
  logger.info({ msg: `${signal} received. Starting graceful shutdown...` });

  httpServer.close(async () => {
    logger.info({ msg: 'HTTP server closed. Cleaning up resources...' });

    try {
      await Promise.allSettled([
        closeDatabasePool(),
        closeRedis(),
      ]);

      logger.info({ msg: '✅ Graceful shutdown complete' });
      process.exit(0);
    } catch (error) {
      logger.error({ msg: 'Error during shutdown', error });
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error({
      msg: `Could not close connections within ${SHUTDOWN_TIMEOUT_MS}ms, forcing shutdown`,
    });
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.fatal({ msg: 'Uncaught Exception — process will exit', error });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ msg: 'Unhandled Promise Rejection', reason });
  process.exit(1);
});

export { httpServer };
