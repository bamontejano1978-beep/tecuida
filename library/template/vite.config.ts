import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { appMeta } from './src/config'

/**
 * Genera un icono PWA como SVG inline a partir del color de marca
 * y la inicial de la app. Así no necesitas crear archivos PNG.
 */
const brandColor = appMeta.brand_color.replace('#', '')
const inicial = appMeta.nombre.charAt(0).toUpperCase()
const svgIcon = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23${brandColor}"/><text x="50" y="68" font-size="55" font-weight="bold" text-anchor="middle" fill="white" font-family="system-ui">${inicial}</text></svg>`

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: appMeta.nombre,
        short_name: appMeta.nombre.slice(0, 12),
        description: appMeta.descripcion,
        theme_color: appMeta.brand_color,
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: svgIcon,
            sizes: '192x192',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.unsplash\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
})
