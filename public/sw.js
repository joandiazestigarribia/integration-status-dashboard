const SHELL_CACHE = "shell-v2"
const STATIC_CACHE = "static-v2"
const MAX_STATIC_ENTRIES = 80
const SHELL_ASSETS = ["/manifest.webmanifest", "/icon-192.png", "/icon-512.png"]
const PRECACHE = ["/", ...SHELL_ASSETS]
const STATIC_URL = /\/_next\/static\/[^"'\s\\)]+/g

async function precache() {
  const shell = await caches.open(SHELL_CACHE)
  await shell.addAll(PRECACHE)
  const html = await (await shell.match("/")).text()
  const assets = [...new Set(html.match(STATIC_URL) ?? [])]
  const statics = await caches.open(STATIC_CACHE)
  await Promise.allSettled(assets.map((url) => statics.add(url)))
}

async function networkFirst(request, cacheName, cacheKey = request) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) await cache.put(cacheKey, response.clone())
    return response
  } catch {
    return (await cache.match(cacheKey)) ?? Response.error()
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) {
    await cache.put(request, response.clone())
    const keys = await cache.keys()
    await Promise.all(
      keys.slice(0, Math.max(0, keys.length - MAX_STATIC_ENTRIES)).map((key) => cache.delete(key)),
    )
  }
  return response
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== SHELL_CACHE && key !== STATIC_CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== "GET" || url.origin !== self.location.origin) return

  if (request.mode === "navigate" && url.pathname === "/") {
    event.respondWith(networkFirst(request, SHELL_CACHE, "/"))
  } else if (SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(networkFirst(request, SHELL_CACHE))
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request))
  }
})
