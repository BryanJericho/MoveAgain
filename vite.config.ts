import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      manifest: {
        name: 'Move Again',
        short_name: 'MoveAgain',
        description: 'Aplikasi pemantauan pemulihan pasca-stroke berbasis computer vision',
        theme_color: '#1d4ed8',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icons/pwa-64x64.png',            sizes: '64x64',   type: 'image/png' },
          { src: 'icons/pwa-192x192.png',           sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512x512.png',           sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Jangan precache WASM/model — terlalu besar (46MB), gagal di HP
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            // WASM + model files: cache on-demand setelah pertama kali diload
            urlPattern: /\.(wasm|task)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-assets',
              expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }
            }
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true }
    }
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision']
  },
  build: {
    sourcemap: false, // suppress missing .map file warnings
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts': ['recharts'],
'ui': ['lucide-react', 'zustand']
        }
      }
    }
  }
})
