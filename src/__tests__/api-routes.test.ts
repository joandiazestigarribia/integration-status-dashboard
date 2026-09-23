/** @jest-environment node */
import { GET as healthGET } from "~/app/api/health/route"
import { GET } from "~/app/api/integrations/[tenantId]/route"
import { POST } from "~/app/api/integrations/[tenantId]/[integrationId]/retry/route"
import { listIntegrations } from "~/lib/server/data"
import type { Integration } from "~/lib/types"

function getRequest(): Request {
  return new Request("http://localhost/api/integrations")
}

function postRequest(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

const params = <T extends Record<string, string>>(values: T): Promise<T> => Promise.resolve(values)

afterEach(() => jest.useRealTimers())

describe("GET /api/integrations/[tenantId]", () => {
  it("devuelve las integraciones normalizadas y la marca de actualización", async () => {
    const response = await GET(getRequest(), { params: params({ tenantId: "tenant-aurora" }) })

    expect(response.status).toBe(200)
    expect(response.headers.get("x-fetched-at")).toEqual(expect.any(String))
    const integrations = (await response.json()) as Integration[]
    expect(integrations.map((integration) => integration.kind).sort()).toEqual([
      "erp",
      "logistics",
      "marketplace",
      "payments",
    ])
  })

  it("responde 404 si el tenant no existe", async () => {
    const response = await GET(getRequest(), { params: params({ tenantId: "tenant-inexistente" }) })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: "Cliente no encontrado" })
  })
})

describe("POST /api/integrations/[tenantId]/[integrationId]/retry", () => {
  const base = () => listIntegrations("tenant-aurora")[0]

  it("reintenta y antepone el evento nuevo, conservando los anteriores", async () => {
    jest.useFakeTimers()
    const integration = base()

    const promise = POST(postRequest(integration), {
      params: params({ tenantId: integration.tenantId, integrationId: integration.id }),
    })
    await jest.advanceTimersByTimeAsync(700)
    const response = await promise

    expect(response.status).toBe(200)
    const updated = (await response.json()) as Integration
    expect(updated.events).toHaveLength(integration.events.length + 1)
    expect(updated.events[0].message).toMatch(/Reintento/)
  })

  it("responde 400 si el cuerpo no es la integración esperada", async () => {
    const integration = base()

    const response = await POST(postRequest({ id: "otra-cosa" }), {
      params: params({ tenantId: integration.tenantId, integrationId: integration.id }),
    })

    expect(response.status).toBe(400)
  })

  it("responde 400 si el cuerpo no es un objeto", async () => {
    const integration = base()

    const response = await POST(postRequest(undefined), {
      params: params({ tenantId: integration.tenantId, integrationId: integration.id }),
    })

    expect(response.status).toBe(400)
  })

  it("responde 400 si el cuerpo no es JSON válido", async () => {
    const integration = base()
    const request = {
      json: async () => Promise.reject(new SyntaxError("Unexpected token")),
    } as unknown as Request

    const response = await POST(request, {
      params: params({ tenantId: integration.tenantId, integrationId: integration.id }),
    })

    expect(response.status).toBe(400)
  })

  it("responde 404 si el tenant no existe", async () => {
    const response = await POST(postRequest(base()), {
      params: params({ tenantId: "tenant-inexistente", integrationId: "aurora-payments" }),
    })

    expect(response.status).toBe(404)
  })

  it("responde 404 si la integración no pertenece al tenant", async () => {
    const response = await POST(postRequest(base()), {
      params: params({ tenantId: "tenant-aurora", integrationId: "bravo-payments" }),
    })

    expect(response.status).toBe(404)
  })
})

describe("GET /api/health", () => {
  it("responde ok", async () => {
    const response = healthGET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: "ok" })
  })
})
