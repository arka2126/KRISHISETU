import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxies /api and /socket.io calls to the backend during local development
export default defineConfig({
  plugins: [react()],
  css: { postcss: {} },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5001', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:5001', changeOrigin: true, ws: true },
    },
  },
});
