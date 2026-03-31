// Service Worker de désinstallation
// Ce fichier vide permet de désinstaller le SW précédent en cache

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName)
        })
      )
    }).then(() => {
      return self.clients.claim()
    }).then(() => {
      return self.registration.unregister()
    })
  )
})
