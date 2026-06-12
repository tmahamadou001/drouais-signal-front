const VERSION = '2.11.0'
const CACHE_NAME = `onsignale-v${VERSION}`
const STATIC_CACHE_NAME = `onsignale-static-v${VERSION}`
const API_CACHE_NAME = `onsignale-api-v${VERSION}`

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/apple-touch-icon.png',
]

const NEVER_CACHE_PATTERNS = [
  /\/api\//,
  /api\.onsignale\.fr/,
  /supabase\.co/,
  /\/auth\//,
  /tile\.openstreetmap\.org/,
  /nominatim\.openstreetmap\.org/,
]

const NETWORK_FIRST_PATTERNS = [
  /\.js$/,
  /\.css$/,
  /\.html$/,
]

const API_CACHE_PATTERNS = [
  /api-adresse\.data\.gouv\.fr/,
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS)
    })
  )
  // Pas de skipWaiting ici — le SW attend que l'utilisateur confirme la mise à jour
  // via le message SKIP_WAITING envoyé par SwUpdateBanner
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(
            (name) =>
              name !== CACHE_NAME &&
              name !== STATIC_CACHE_NAME &&
              name !== API_CACHE_NAME
          )
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  const shouldNeverCache = NEVER_CACHE_PATTERNS.some(
    (pattern) => pattern.test(url.href)
  )
  if (shouldNeverCache) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Si la réponse est correcte (HTML de l'app), on la met en cache et on la retourne
          if (response && response.ok) {
            const clone = response.clone()
            caches.open(STATIC_CACHE_NAME).then((cache) => cache.put('/index.html', clone))
            return response
          }
          // Réponse invalide (ex: 404 serveur) → SPA fallback
          return caches.match('/index.html')
        })
        .catch(() =>
          // Hors ligne → toujours servir index.html depuis le cache (pas offline.html)
          // pour que Vue Router puisse afficher la page
          caches.match('/index.html')
        )
    )
    return
  }

  // Network First for external APIs (with API cache)
  const shouldCacheApi = API_CACHE_PATTERNS.some(
    (pattern) => pattern.test(url.href)
  )

  if (shouldCacheApi) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone()
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Network First for JS, CSS, HTML
  const shouldNetworkFirst = NETWORK_FIRST_PATTERNS.some(
    (pattern) => pattern.test(url.pathname)
  )

  if (shouldNetworkFirst) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone()
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Cache First for other assets (images, fonts, etc.)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse
      return fetch(request).then((response) => {
        if (
          !response ||
          response.status !== 200 ||
          response.type === 'opaque'
        ) {
          return response
        }
        const responseToCache = response.clone()
        caches.open(STATIC_CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache)
        })
        return response
      })
    })
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'AUTH_REDIRECT') {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'NAVIGATE',
          url: event.data.url,
        })
      })
    })
  }

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
