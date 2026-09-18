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

// Solo el app shell entra al caché; el resto (los chunks de JS/CSS con hash,
// que cambian en cada build) va directo a red. Cachear cualquier GET del
// mismo origen hacía que el caché creciera para siempre: nada lo podaba
// dentro de un mismo CACHE_NAME, así que un chunk de una build vieja se
// quedaba ahí aunque ya no existiera en el servidor. Con esto, lo único
// versionado es el shell, y sigue siendo lo único que necesita este
// dashboard para abrir sin red (los datos son mock, no hay una API real
// cuyo último payload cachear).
self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return
  if (!APP_SHELL.includes(new URL(request.url).pathname)) return

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
