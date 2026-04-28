const VERSION = '2.1.1'
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

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS)
    })
  )
  self.skipWaiting()
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
        .catch(() => caches.match('/offline.html'))
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
