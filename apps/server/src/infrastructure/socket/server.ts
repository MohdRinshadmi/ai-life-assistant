import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents } from '@ai-life/shared';
import { config, logger } from '@config';
import { verifyAccessToken } from '@shared/utils/jwt';

export type TypedSocketServer = SocketIOServer<ClientToServerEvents, ServerToClientEvents>;

let io: TypedSocketServer | null = null;

/**
 * Attach Socket.io to the existing HTTP server.
 *
 * Why same port as REST?
 * - One firewall rule, one TLS cert, one load-balancer target
 * - Mobile client only needs one base URL
 * - Socket.io upgrade happens on the same TCP connection
 *
 * Scaling to multi-instance: add the Redis adapter:
 *   import { createAdapter } from '@socket.io/redis-adapter';
 *   io.adapter(createAdapter(pubClient, subClient));
 */
export function createSocketServer(httpServer: HTTPServer): TypedSocketServer {
  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: config.cors.origins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Skip long-polling — React Native doesn't handle it well and
    // this halves the connection handshake time.
    transports: ['websocket'],
    pingTimeout: 60_000,
    pingInterval: 25_000,
  });

  // ── Auth middleware ────────────────────────────────
  // Token arrives in socket.handshake.auth.token, not in HTTP headers.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('Authentication token missing'));
      const decoded = verifyAccessToken(token);
      socket.data.userId = decoded.userId;
      socket.data.email = decoded.email;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    logger.info({ msg: 'Socket connected', socketId: socket.id, userId });

    // Each user joins a private room — lets us push to all their devices
    // with io.to(userId).emit() without tracking individual socket IDs.
    socket.join(userId);

    socket.on('disconnect', (reason) => {
      logger.info({ msg: 'Socket disconnected', socketId: socket.id, userId, reason });
    });
  });

  logger.info({ msg: 'Socket.io server initialized' });
  return io;
}

export function getIO(): TypedSocketServer {
  if (!io) throw new Error('Socket.io server not initialized');
  return io;
}
