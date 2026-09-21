import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"

const ORIGIN = "https://app.test"
const SW_SOURCE = fs.readFileSync(path.join(process.cwd(), "public", "sw.js"), "utf8")
const SHELL = "shell-v2"
const STATIC = "static-v2"

interface FakeResponse {
  ok: boolean
  body: string
  clone: () => FakeResponse
  text: () => Promise<string>
}

type RequestLike = string | { url: string }

function makeResponse(body = "", ok = true): FakeResponse {
  return { ok, body, clone: () => makeResponse(body, ok), text: async () => body }
}

const NETWORK_ERROR = makeResponse("network error", false)

function toUrl(request: RequestLike): string {
  return typeof request === "string" ? new URL(request, ORIGIN).href : request.url
}

class FakeCache {
  readonly entries = new Map<string, FakeResponse>()

  constructor(private readonly fetchImpl: (request: RequestLike) => Promise<FakeResponse>) {}

  async match(request: RequestLike) {
    return this.entries.get(toUrl(request))
  }

  async put(request: RequestLike, response: FakeResponse) {
    this.entries.set(toUrl(request), response)
  }

  async add(request: RequestLike) {
    const response = await this.fetchImpl(request)
    if (!response.ok) throw new Error(`bad response for ${toUrl(request)}`)
    await this.put(request, response)
  }

  async addAll(requests: RequestLike[]) {
    await Promise.all(requests.map((request) => this.add(request)))
  }

  async keys() {
    return [...this.entries.keys()].map((url) => ({ url }))
  }

  async delete(request: RequestLike) {
    return this.entries.delete(toUrl(request))
  }
}

function setup() {
  const listeners: Record<string, (event: unknown) => void> = {}
  const stores = new Map<string, FakeCache>()
  const network = { offline: false, calls: [] as string[], routes: new Map<string, FakeResponse>() }
  const claim = jest.fn()

  async function fakeFetch(request: RequestLike) {
    const url = toUrl(request)
    network.calls.push(url)
    if (network.offline) throw new TypeError("Failed to fetch")
    return network.routes.get(url) ?? makeResponse("not found", false)
  }

  const caches = {
    open: async (name: string) => {
      let store = stores.get(name)
      if (!store) {
        store = new FakeCache(fakeFetch)
        stores.set(name, store)
      }
      return store
    },
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  }

  vm.runInNewContext(SW_SOURCE, {
    self: {
      addEventListener: (type: string, listener: (event: unknown) => void) => {
        listeners[type] = listener
      },
      location: { origin: ORIGIN },
      clients: { claim },
      skipWaiting: jest.fn(),
    },
    caches,
    fetch: fakeFetch,
    Response: { error: () => NETWORK_ERROR },
    URL,
  })

  async function lifecycle(type: "install" | "activate") {
    const pending: Promise<unknown>[] = []
    listeners[type]({ waitUntil: (promise: Promise<unknown>) => pending.push(promise) })
    await Promise.all(pending)
  }

  function request(url: string, init: { method?: string; mode?: string } = {}) {
    let response: Promise<FakeResponse> | undefined
    listeners.fetch({
      request: {
        url: url.startsWith("http") ? url : `${ORIGIN}${url}`,
        method: "GET",
        mode: "cors",
        ...init,
      },
      respondWith: (promise: Promise<FakeResponse>) => {
        response = promise
      },
    })
    return response
  }

  function route(url: string, response: FakeResponse) {
    network.routes.set(`${ORIGIN}${url}`, response)
  }

  return { caches, claim, lifecycle, network, request, route }
}

const HTML = [
  '<link rel="stylesheet" href="/_next/static/chunks/app.css">',
  '<script src="/_next/static/chunks/main.js?dpl=abc"></script>',
  '<script>self.__next_f.push([1,"\\"/_next/static/chunks/lazy.js\\""])</script>',
].join("")

function routeShell(sw: ReturnType<typeof setup>) {
  sw.route("/", makeResponse(HTML))
  sw.route("/manifest.webmanifest", makeResponse("manifest"))
  sw.route("/icon-192.png", makeResponse("icon"))
  sw.route("/icon-512.png", makeResponse("icon"))
}

describe("service worker", () => {
  describe("install", () => {
    it("precachea el shell y los assets estáticos que aparecen en el HTML", async () => {
      const sw = setup()
      routeShell(sw)
      sw.route("/_next/static/chunks/app.css", makeResponse("css"))
      sw.route("/_next/static/chunks/main.js?dpl=abc", makeResponse("main"))
      sw.route("/_next/static/chunks/lazy.js", makeResponse("lazy"))

      await sw.lifecycle("install")

      const shell = await sw.caches.open(SHELL)
      const statics = await sw.caches.open(STATIC)
      expect([...shell.entries.keys()]).toEqual([
        `${ORIGIN}/`,
        `${ORIGIN}/manifest.webmanifest`,
        `${ORIGIN}/icon-192.png`,
        `${ORIGIN}/icon-512.png`,
      ])
      expect([...statics.entries.keys()].sort()).toEqual([
        `${ORIGIN}/_next/static/chunks/app.css`,
        `${ORIGIN}/_next/static/chunks/lazy.js`,
        `${ORIGIN}/_next/static/chunks/main.js?dpl=abc`,
      ])
    })

    it("no falla la instalación si un asset estático no se puede bajar", async () => {
      const sw = setup()
      routeShell(sw)
      sw.route("/_next/static/chunks/main.js?dpl=abc", makeResponse("main"))

      await expect(sw.lifecycle("install")).resolves.toBeUndefined()

      const statics = await sw.caches.open(STATIC)
      expect([...statics.entries.keys()]).toEqual([`${ORIGIN}/_next/static/chunks/main.js?dpl=abc`])
    })

    it("falla la instalación si el shell no se puede bajar", async () => {
      const sw = setup()

      await expect(sw.lifecycle("install")).rejects.toThrow()
    })
  })

  describe("activate", () => {
    it("borra las cachés de versiones anteriores y conserva las vigentes", async () => {
      const sw = setup()
      await sw.caches.open("integration-dashboard-shell-v1")
      await sw.caches.open(SHELL)
      await sw.caches.open(STATIC)

      await sw.lifecycle("activate")

      expect(await sw.caches.keys()).toEqual([SHELL, STATIC])
      expect(sw.claim).toHaveBeenCalledTimes(1)
    })
  })

  describe("navegación a la raíz", () => {
    it("con red devuelve la página vigente y la guarda para el modo offline", async () => {
      const sw = setup()
      const fresh = makeResponse("html nuevo")
      sw.route("/", fresh)

      const response = await sw.request("/", { mode: "navigate" })

      expect(response).toBe(fresh)
      expect((await (await sw.caches.open(SHELL)).match("/"))?.body).toBe("html nuevo")
    })

    it("sin conexión devuelve la última página guardada", async () => {
      const sw = setup()
      const saved = makeResponse("html guardado")
      await (await sw.caches.open(SHELL)).put("/", saved)
      sw.network.offline = true

      expect(await sw.request("/", { mode: "navigate" })).toBe(saved)
    })

    it("sin conexión y sin nada guardado devuelve un error de red", async () => {
      const sw = setup()
      sw.network.offline = true

      expect(await sw.request("/", { mode: "navigate" })).toBe(NETWORK_ERROR)
    })

    it("no reemplaza la página guardada con una respuesta de error del servidor", async () => {
      const sw = setup()
      const saved = makeResponse("html guardado")
      await (await sw.caches.open(SHELL)).put("/", saved)
      sw.route("/", makeResponse("boom", false))

      await sw.request("/", { mode: "navigate" })

      expect(await (await sw.caches.open(SHELL)).match("/")).toBe(saved)
    })
  })

  describe("manifest e íconos", () => {
    it("con red devuelve la versión vigente y la guarda", async () => {
      const sw = setup()
      const fresh = makeResponse("manifest nuevo")
      sw.route("/manifest.webmanifest", fresh)

      expect(await sw.request("/manifest.webmanifest")).toBe(fresh)
      expect((await (await sw.caches.open(SHELL)).match("/manifest.webmanifest"))?.body).toBe(
        "manifest nuevo",
      )
    })

    it("sin conexión usa la copia guardada", async () => {
      const sw = setup()
      const saved = makeResponse("manifest guardado")
      await (await sw.caches.open(SHELL)).put("/manifest.webmanifest", saved)
      sw.network.offline = true

      expect(await sw.request("/manifest.webmanifest")).toBe(saved)
    })
  })

  describe("assets de /_next/static", () => {
    const asset = "/_next/static/chunks/main.js"

    it("si ya están en caché no vuelve a pedirlos a la red", async () => {
      const sw = setup()
      const saved = makeResponse("main guardado")
      await (await sw.caches.open(STATIC)).put(asset, saved)

      expect(await sw.request(asset)).toBe(saved)
      expect(sw.network.calls).toEqual([])
    })

    it("si no están, los pide a la red y los guarda", async () => {
      const sw = setup()
      const fresh = makeResponse("main nuevo")
      sw.route(asset, fresh)

      expect(await sw.request(asset)).toBe(fresh)
      expect((await (await sw.caches.open(STATIC)).match(asset))?.body).toBe("main nuevo")
    })

    it("sin conexión y sin copia guardada, el pedido falla", async () => {
      const sw = setup()
      sw.network.offline = true

      await expect(sw.request(asset)).rejects.toThrow("Failed to fetch")
    })

    it("descarta primero los más viejos al pasar el tope de entradas", async () => {
      const sw = setup()
      for (let index = 0; index < 85; index++) {
        sw.route(`/_next/static/chunks/c${index}.js`, makeResponse(`c${index}`))
        await sw.request(`/_next/static/chunks/c${index}.js`)
      }

      const statics = await sw.caches.open(STATIC)
      expect(statics.entries.size).toBe(80)
      expect(await statics.match("/_next/static/chunks/c84.js")).toBeDefined()
      expect(await statics.match("/_next/static/chunks/c0.js")).toBeUndefined()
      expect(await statics.match("/_next/static/chunks/c5.js")).toBeDefined()
    })
  })

  describe("pedidos que no maneja", () => {
    it.each([
      ["un método distinto de GET", "/_next/static/chunks/main.js", { method: "POST" }],
      ["una ruta que no es del shell ni estática", "/api/integraciones", {}],
      ["un pedido a otro origen", "https://otro.test/_next/static/chunks/main.js", {}],
    ])("ignora %s", (_label, url, init) => {
      const sw = setup()

      expect(sw.request(url, init)).toBeUndefined()
    })
  })
})
