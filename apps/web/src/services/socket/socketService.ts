import { io, type Socket } from 'socket.io-client';
import { env } from '@/config/env';
import { useAuthStore } from '@/stores/authStore';

// Mirrors the mobile socketService: Socket.io with token auth on each handshake.
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(env.socketUrl, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
    autoConnect: false,
    auth: (cb) => cb({ token: useAuthStore.getState().accessToken }),
  });
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
