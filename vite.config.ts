import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://hempllll.github.io/training-diary/ on GitHub Pages,
  // so assets must resolve under the /training-diary/ subpath.
  base: '/training-diary/',
  plugins: [
    react(),
    // Generates the web app manifest and a Workbox service worker that
    // precaches the build, so the installed app works offline in the gym.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Training Diary',
        short_name: 'Training',
        description: 'Track your gym workouts and progress per exercise.',
        theme_color: '#101317',
        background_color: '#101317',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
