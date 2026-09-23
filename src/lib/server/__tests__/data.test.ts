import { applyRetry, findTenant, hasIntegration, listIntegrations, listTenants } from "~/lib/server/data"
import type { Integration } from "~/lib/types"

describe("listTenants", () => {
  it("devuelve los tenants mockeados", () => {
    expect(listTenants().map((tenant) => tenant.id)).toEqual([
      "tenant-aurora",
      "tenant-bravo",
      "tenant-cedro",
    ])
  })
})

describe("findTenant", () => {
  it("encuentra un tenant por id", () => {
    expect(findTenant("tenant-bravo")?.name).toBe("Bravo Foods")
  })

  it("devuelve undefined para un tenant desconocido", () => {
    expect(findTenant("tenant-inexistente")).toBeUndefined()
  })
})

describe("listIntegrations", () => {
  it("normaliza y junta las integraciones de pagos, logística, ERP y marketplace de un tenant", () => {
    const kinds = listIntegrations("tenant-aurora")
      .map((integration) => integration.kind)
      .sort()

    expect(kinds).toEqual(["erp", "logistics", "marketplace", "payments"])
  })

  it("no exige que todos los tenants tengan todos los tipos de integración", () => {
    const kinds = listIntegrations("tenant-cedro")
      .map((integration) => integration.kind)
      .sort()

    expect(kinds).toEqual(["erp", "logistics", "payments"])
  })

  it("ordena los eventos de cada integración de más nuevo a más viejo", () => {
    const [integration] = listIntegrations("tenant-aurora")
    const timestamps = integration.events.map((event) => new Date(event.timestamp).getTime())

    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a))
  })

  it("devuelve una lista vacía para un tenant sin datos", () => {
    expect(listIntegrations("tenant-inexistente")).toEqual([])
  })
})

describe("hasIntegration", () => {
  it("reconoce una integración del tenant", () => {
    expect(hasIntegration("tenant-aurora", "aurora-payments")).toBe(true)
  })

  it("rechaza una integración que no pertenece al tenant", () => {
    expect(hasIntegration("tenant-aurora", "bravo-payments")).toBe(false)
  })
})

describe("applyRetry", () => {
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

  it("cuando el reintento resuelve, pasa a up_to_date y agrega un evento nuevo al principio", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.9)

    const updated = applyRetry(base)

    expect(updated.status).toBe("up_to_date")
    expect(updated.events[0].message).toBe("Reintento exitoso")
    expect(updated.events).toHaveLength(base.events.length + 1)
    expect(updated.lastSyncedAt).not.toBe(base.lastSyncedAt)
  })

  it("cuando el reintento no resuelve, se mantiene en retrying y no toca lastSyncedAt", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.1)

    const updated = applyRetry(base)

    expect(updated.status).toBe("retrying")
    expect(updated.events[0].message).toBe("Reintento en curso, todavía sin confirmación")
    expect(updated.lastSyncedAt).toBe(base.lastSyncedAt)
  })
})
