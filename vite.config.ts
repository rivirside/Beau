import { defineConfig, type Plugin } from 'vite'
import { execSync } from 'node:child_process'

/** Stamped into the bundle so Settings can show exactly what is running. */
const commit = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'dev' }
})()
const APP_VERSION = `${new Date().toISOString().slice(0, 10)}+${commit}`
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'

/** Served from https://<user>.github.io/Beau/ — every asset path depends on this. */
const BASE = process.env.BEAU_BASE ?? '/Beau/'

/** version.json is what the Settings update check fetches. It is emitted at
 *  build time and deliberately excluded from the service worker precache — a
 *  precached version file would forever report the version that cached it. */
const versionFile: Plugin = {
  name: 'beau-version-file',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json',
                    source: JSON.stringify({ version: APP_VERSION, builtAt: new Date().toISOString() }) })
  },
}

export default defineConfig({
  base: BASE,
  plugins: [
    preact(),
    versionFile,
    VitePWA({
      // 'prompt' rather than 'autoUpdate': the Settings screen owns when an
      // update is applied, so a new version never reloads mid-set.
      registerType: 'prompt',
      injectRegister: null,
      manifest: {
        name: 'Beau',
        short_name: 'Beau',
        description: 'Adaptive strength training. Everything stays on your phone.',
        theme_color: '#0f1115',
        background_color: '#0f1115',
        display: 'standalone',
        orientation: 'portrait',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['**/version.json'],
        // Exercise photos are 17MB. Never precache them; cache on first view.
        navigateFallback: `${BASE}index.html`,
        runtimeCaching: [{
          urlPattern: /\/exercise-images\/.*\.webp$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'exercise-images',
            expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 90 },
          },
        }],
      },
    }),
  ],
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  build: { target: 'es2022', sourcemap: true },
})
