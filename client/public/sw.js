// Self-destructing service worker: unregisters itself and clears every cache.
// Existing clients with the old cache-first SW will install this on next visit,
// which immediately wipes its own caches and unregisters, restoring the app.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      } catch (_e) {
        // ignore
      }
      try {
        await self.registration.unregister()
      } catch (_e) {
        // ignore
      }
      const clients = await self.clients.matchAll({ type: 'window' })
      clients.forEach((client) => {
        try {
          client.navigate(client.url)
        } catch (_e) {
          // ignore
        }
      })
    })()
  )
})
