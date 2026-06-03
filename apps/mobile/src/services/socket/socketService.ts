import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '@ai-life/shared';
import { env } from '@config';
import { SOCKET_OPTIONS } from '@constants';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

/**
 * Connect to the Socket.io server with a JWT access token.
 *
 * Call this once after login / on app resume if the token has changed.
 * Subsequent calls with the same token are no-ops.
 *
 * We force WebSocket transport to skip HTTP long-polling entirely —
 * polling is slower, burns mobile battery, and React Native's fetch
 * implementation has edge-case issues with SSE-style chunked responses.
 */
export function connectSocket(accessToken: string): AppSocket {
  if (socket?.connected) return socket;

  // Disconnect stale socket before creating a new one (token refresh case)
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  // Force WebSocket transport — skip HTTP long-polling (slower, battery-hungry,
  // and flaky with React Native's chunked-response handling).
  socket = io(env.socketUrl, {
    auth: { token: accessToken },
    transports: ['websocket'],
    ...SOCKET_OPTIONS,
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): AppSocket | null {
  return socket;
}

export function isConnected(): boolean {
  return socket?.connected ?? false;
}
