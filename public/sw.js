/**
 * Service Worker — TE CUIDA PWA
 *
 * Cachea los assets estáticos para funcionamiento offline básico.
 * Cada app (subdominio) usa este mismo service worker.
 */

const CACHE_NAME = 'tecuida-pwa-v1'

// Assets a cachear en la instalación
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
]

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    }),
  )
})

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      )
    }),
  )
})

self.addEventListener('fetch', (event: FetchEvent) => {
  // Solo cachear peticiones GET del mismo origen
  if (event.request.method !== 'GET') return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached

      return fetch(event.request).then((response) => {
        // No cachear peticiones a API
        if (
          response.ok &&
          !event.request.url.includes('/api/') &&
          !event.request.url.includes('/auth/')
        ) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone)
          })
        }
        return response
      })
    }),
  )
})
