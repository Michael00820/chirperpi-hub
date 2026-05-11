const STATIC_CACHE = 'chirperpi-static-v3'
const API_CACHE = 'chirperpi-api-v3'
const staticAssets = [
  '/favicon.svg',
  '/default-avatar.png'
]

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.all(
        staticAssets.map((asset) =>
          cache.add(asset).catch(() => undefined)
        )
      )
    )
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
          return undefined
        })
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return
  }

  // Never cache HTML / navigation requests — always network-first so updates ship immediately
  const isNavigation =
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html')

  if (isNavigation) {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    )
    return
  }

  // Never cache the JS/CSS bundles or dev/HMR assets — Vite hashes them and stale copies break the app
  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.map')
  ) {
    return
  }

  // API: network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(API_CACHE).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() =>
          caches.match(request).then(
            (cached) => cached || new Response(null, { status: 503 })
          )
        )
    )
    return
  }

  // Static assets (images, etc): cache-first
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone))
          }
          return response
        })
    )
  )
})
