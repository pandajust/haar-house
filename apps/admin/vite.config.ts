/// <reference types="vitest/config" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiBase = process.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const apiPrefix = process.env.VITE_API_PREFIX ?? '/api/v1';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    open: false,
    proxy: {
      // 前端直接走 /api 代理到后端，避免 CORS；也可通过 VITE_API_BASE_URL 直连
      [apiPrefix]: {
        target: apiBase,
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
