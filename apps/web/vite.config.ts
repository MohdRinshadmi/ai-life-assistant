import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // Point at the TS source so Vite compiles it directly (the CJS dist
      // build breaks Rollup's named-export detection for re-exports).
      '@ai-life/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 5180,
    proxy: {
      '/api': {
        target: process.env.API_ORIGIN ?? 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: process.env.API_ORIGIN ?? 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
