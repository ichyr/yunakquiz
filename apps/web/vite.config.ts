import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'] },
  server: {
    proxy: { '/api': process.env['API_URL'] ?? 'http://localhost:3000' },
  },
  preview: {
    proxy: { '/api': process.env['API_URL'] ?? 'http://localhost:3000' },
  },
});
