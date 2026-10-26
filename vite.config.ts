/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Calculus I Mastery Lab', short_name: 'Calc Lab',
        description: 'Interactive derivatives, curve sketching and optimization lab',
        theme_color: '#0f172a', background_color: '#0f172a', display: 'standalone',
        start_url: './', scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { cleanupOutdatedCaches: true, clientsClaim: true, skipWaiting: true, globPatterns: ['**/*.{js,css,html,svg,png,woff2}'], maximumFileSizeToCacheInBytes: 5_000_000 },
    }),
  ],
  build: { chunkSizeWarningLimit: 2000 },
  test: { environment: 'node' },
});
