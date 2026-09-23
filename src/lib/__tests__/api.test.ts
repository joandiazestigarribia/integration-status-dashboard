import { getIntegrations, retryIntegration } from "~/lib/api"
import { ApiError } from "~/lib/http"
import type { Integration } from "~/lib/types"

const fetchMock = jest.fn()

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
  } as unknown as Response
}

const integration: Integration = {
  id: "aurora-payments",
  tenantId: "tenant-aurora",
  name: "Mercado Pago",
  kind: "payments",
  status: "retrying",
  lastSyncedAt: "2026-01-01T00:00:00.000Z",
  recordsSynced: 10,
  events: [],
}

beforeEach(() => {
  fetchMock.mockReset()
  global.fetch = fetchMock as unknown as typeof fetch
})

describe("getIntegrations", () => {
  it("pide las integraciones del tenant por HTTP", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([integration], 200, { "x-fetched-at": "2026-01-02T00:00:00.000Z" }),
    )

    const result = await getIntegrations("tenant-aurora")

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/integrations/tenant-aurora",
      expect.objectContaining({ method: "GET" }),
    )
    expect(result.integrations).toEqual([integration])
    expect(result.fetchedAt).toBe("2026-01-02T00:00:00.000Z")
  })

  it("escapa el id del tenant en la URL", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]))

    await getIntegrations("tenant/../otro")

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/integrations/tenant%2F..%2Fotro",
      expect.objectContaining({ method: "GET" }),
    )
  })

  it("devuelve fetchedAt null si el servidor no manda la marca", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([integration]))

    const result = await getIntegrations("tenant-aurora")

    expect(result.fetchedAt).toBeNull()
  })

  it("propaga la señal de cancelación al fetch", async () => {
    const controller = new AbortController()
    fetchMock.mockResolvedValueOnce(jsonResponse([]))

    await getIntegrations("tenant-aurora", { signal: controller.signal })

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/integrations/tenant-aurora",
      expect.objectContaining({ signal: controller.signal }),
    )
  })

  it("lanza ApiError si el tenant no existe", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Cliente no encontrado" }, 404))

    await expect(getIntegrations("tenant-inexistente")).rejects.toBeInstanceOf(ApiError)
  })
})

describe("retryIntegration", () => {
  it("hace POST al endpoint de reintento con el estado actual de la integración", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...integration, status: "up_to_date" }))

    const updated = await retryIntegration(integration)

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/integrations/tenant-aurora/aurora-payments/retry",
      expect.objectContaining({ method: "POST", body: JSON.stringify(integration) }),
    )
    expect(updated.status).toBe("up_to_date")
  })

  it("no reintenta el POST si el servidor rechaza el cuerpo", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "Cuerpo inválido" }, 400))

    await expect(retryIntegration(integration)).rejects.toMatchObject({ status: 400 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
