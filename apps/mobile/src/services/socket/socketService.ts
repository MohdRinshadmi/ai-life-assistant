import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '@ai-life/shared';
import { env } from '@config';
import { SOCKET_OPTIONS } from '@constants';
import { useAuthStore } from '@stores/authStore';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

/**
 * Connect to the Socket.io server.
 *
 * The JWT is supplied via a *dynamic* auth callback: socket.io invokes it on
 * every (re)connection attempt, so each handshake sends the freshest token from
 * the auth store — not one captured when the socket was first created. This is
 * essential because access tokens are short-lived: a token captured at creation
 * is often already expired by the time chat opens, and socket.io does NOT retry
 * after a server auth-middleware rejection. When the token later refreshes,
 * calling connectSocket() again (see useChat's [accessToken] effect) re-attempts
 * the handshake and this callback supplies the new token.
 *
 * We force WebSocket transport to skip HTTP long-polling entirely — polling is
 * slower, burns mobile battery, and React Native's fetch implementation has
 * edge-case issues with SSE-style chunked responses.
 */
export function connectSocket(): AppSocket {
  if (!socket) {
    socket = io(env.socketUrl, {
      auth: (cb) => cb({ token: useAuthStore.getState().accessToken ?? '' }),
      transports: ['websocket'],
      ...SOCKET_OPTIONS,
    });
  } else if (!socket.connected) {
    // Re-attempt a handshake that previously failed/closed, with the current token.
    socket.connect();
  }

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
