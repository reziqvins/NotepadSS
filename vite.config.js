import { defineConfig } from 'vite';

export default defineConfig({
  root: './',
  base: './', // relative path for Electron, Web & Capacitor
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: true
  }
});
