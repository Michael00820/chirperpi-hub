export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return
  }

  // Kill switch: aggressively unregister any existing service workers and clear
  // all caches on every load. This recovers users stuck on a previously-cached
  // broken HTML shell. The SW is not currently needed for core functionality.
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister().catch(() => undefined)
    })
  })

  if (typeof caches !== 'undefined') {
    caches.keys().then((keys) => {
      keys.forEach((key) => {
        caches.delete(key).catch(() => undefined)
      })
    })
  }
}
