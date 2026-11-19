import { defineConfig } from 'vite';

export default defineConfig({
  base: './',                 // chemins relatifs (obligatoire pour l'APK Capacitor)
  build: { outDir: 'dist', chunkSizeWarningLimit: 2000, target: 'es2022' },
  server: { host: true },
});
