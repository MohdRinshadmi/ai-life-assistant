// In dev, Vite proxies /api and /socket.io to the server on :3000 (see vite.config.ts).
// In prod, set VITE_API_URL / VITE_SOCKET_URL to the deployed server origin.
export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1',
  socketUrl: (import.meta.env.VITE_SOCKET_URL as string | undefined) ?? '/',
  apiTimeout: 30000,
  isDev: import.meta.env.DEV,
};
