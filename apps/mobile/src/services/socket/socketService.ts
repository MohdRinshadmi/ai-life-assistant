import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import { ServerToClientEvents, ClientToServerEvents } from '@ai-life/shared';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = Platform.select({
  android: 'http://10.0.2.2:3000',
  ios: 'http://localhost:3000',
  default: 'http://localhost:3000',
})!;

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

  socket = io(SERVER_URL, {
    auth: { token: accessToken },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
    timeout: 20_000,
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
