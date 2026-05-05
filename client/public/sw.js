const STATIC_CACHE = 'picomnect-static-v1'
const API_CACHE = 'picomnect-api-v1'
const staticAssets = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/default-avatar.png'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(staticAssets))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (![STATIC_CACHE, API_CACHE].includes(cacheName)) {
            return caches.delete(cacheName)
          }
        })
      )
    )
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (request.method !== 'GET') {
    return
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(API_CACHE).then((cache) =>
        cache.match(request).then((cachedResponse) =>
          fetch(request)
            .then((response) => {
              if (response.ok) {
                cache.put(request, response.clone())
              }
              return response
            })
            .catch(() => cachedResponse || new Response(null, { status: 503 }))
        )
      )
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) =>
      cachedResponse || fetch(request).then((response) => {
        const responseClone = response.clone()
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseClone))
        return response
      })
    )
  )
})
