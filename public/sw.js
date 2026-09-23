const SHELL_CACHE = "shell-v3"
const STATIC_CACHE = "static-v3"
const API_CACHE = "api-v1"
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
  await trimCache(statics, MAX_STATIC_ENTRIES)
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys()
  const excess = keys.length - maxEntries
  if (excess <= 0) return
  await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)))
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
    await trimCache(cache, MAX_STATIC_ENTRIES)
  }
  return response
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener("activate", (event) => {
  const current = [SHELL_CACHE, STATIC_CACHE, API_CACHE]
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !current.includes(key)).map((key) => caches.delete(key))),
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
  } else if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, API_CACHE))
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request))
  }
})
