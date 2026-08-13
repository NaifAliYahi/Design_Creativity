import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages: VITE_BASE=/اسم-المستودع/  |  Render/محلي: /
const base = process.env.VITE_BASE || '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});