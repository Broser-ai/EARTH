import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5180,
    proxy: {
      '/health': { target: 'http://127.0.0.1:3001', changeOrigin: true },
      '/v1': { target: 'http://127.0.0.1:3001', changeOrigin: true },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5180,
  },
});
