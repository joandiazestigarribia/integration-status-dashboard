const CACHE_NAME = "integration-dashboard-shell-v1"
const APP_SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

// Stale-while-revalidate para el mismo origen: si hay copia en caché se
// responde con ella y en paralelo se actualiza desde la red; si no hay copia,
// se va a la red, y sin red las navegaciones caen al shell "/". Este
// dashboard genera sus datos en memoria (son mock), así que lo que este
// service worker realmente resuelve es que la app abra sin red: todavía no
// hay una API real cuyo último payload cachear.
self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() => cached || (request.mode === "navigate" ? caches.match("/") : Response.error()))
      return cached || network
    }),
  )
})
