import { getIntegrations, getTenants, retryIntegration } from "~/lib/api"
import type { Integration } from "~/lib/types"

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

async function resolved<T>(promise: Promise<T>, ms: number): Promise<T> {
  await jest.advanceTimersByTimeAsync(ms)
  return promise
}

describe("getTenants", () => {
  it("devuelve los tenants mockeados", async () => {
    const tenants = await resolved(getTenants(), 500)
    expect(tenants.map((t) => t.id)).toEqual(["tenant-aurora", "tenant-bravo", "tenant-cedro"])
  })
})

describe("getIntegrations", () => {
  it("normaliza y junta las integraciones de pagos, logística, ERP y marketplace de un tenant", async () => {
    const integrations = await resolved(getIntegrations("tenant-aurora"), 500)
    expect(integrations.map((i) => i.kind).sort()).toEqual(["erp", "logistics", "marketplace", "payments"])
  })

  it("no exige que todos los tenants tengan todos los tipos de integración", async () => {
    const integrations = await resolved(getIntegrations("tenant-cedro"), 500)
    expect(integrations.map((i) => i.kind).sort()).toEqual(["erp", "logistics", "payments"])
  })

  it("ordena los eventos de cada integración de más nuevo a más viejo", async () => {
    const [integration] = await resolved(getIntegrations("tenant-aurora"), 500)
    const timestamps = integration.events.map((e) => new Date(e.timestamp).getTime())
    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a))
  })

  it("devuelve una lista vacía para un tenant sin datos", async () => {
    const integrations = await resolved(getIntegrations("tenant-inexistente"), 500)
    expect(integrations).toEqual([])
  })
})

describe("retryIntegration", () => {
  const base: Integration = {
    id: "int-1",
    tenantId: "tenant-1",
    name: "Integración de prueba",
    kind: "payments",
    status: "retrying",
    lastSyncedAt: "2026-01-01T00:00:00.000Z",
    recordsSynced: 10,
    events: [{ id: "evt-0", timestamp: "2025-12-31T00:00:00.000Z", status: "retrying", message: "previo" }],
  }

  afterEach(() => jest.spyOn(Math, "random").mockRestore())

  it("cuando el reintento resuelve, pasa a up_to_date y agrega un evento nuevo al principio", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.9)

    const updated = await resolved(retryIntegration(base), 1000)

    expect(updated.status).toBe("up_to_date")
    expect(updated.events[0].message).toBe("Reintento exitoso")
    expect(updated.events).toHaveLength(base.events.length + 1)
    expect(updated.lastSyncedAt).not.toBe(base.lastSyncedAt)
  })

  it("cuando el reintento no resuelve, se mantiene en retrying y no toca lastSyncedAt", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.1)

    const updated = await resolved(retryIntegration(base), 1000)

    expect(updated.status).toBe("retrying")
    expect(updated.events[0].message).toBe("Reintento en curso, todavía sin confirmación")
    expect(updated.lastSyncedAt).toBe(base.lastSyncedAt)
  })
})
