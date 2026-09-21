import {
  normalizeErpIntegration,
  normalizeLogisticsIntegration,
  normalizeMarketplaceIntegration,
  normalizePaymentsIntegration,
} from "~/lib/adapters/normalize"
import type {
  RawErpIntegration,
  RawLogisticsIntegration,
  RawMarketplaceIntegration,
  RawPaymentsIntegration,
} from "~/lib/adapters/raw-types"

describe("normalizePaymentsIntegration", () => {
  const raw: RawPaymentsIntegration = {
    integration_id: "int-1",
    tenant_id: "tenant-1",
    display_name: "Mercado Pago",
    last_sync_unix: 1_700_000_000,
    synced_count: 10,
    gateway_status: "degraded",
    log: [{ ts_unix: 1_700_000_000, state: "degraded", detail: "reintentando" }],
  }

  it("mapea gateway_status a un SyncStatus del dominio", () => {
    const result = normalizePaymentsIntegration(raw)
    expect(result.status).toBe("retrying")
  })

  it("convierte el timestamp unix a ISO", () => {
    const result = normalizePaymentsIntegration(raw)
    expect(result.lastSyncedAt).toBe(new Date(1_700_000_000 * 1000).toISOString())
  })

  it("preserva un evento por cada entrada del log", () => {
    const result = normalizePaymentsIntegration(raw)
    expect(result.events).toHaveLength(1)
    expect(result.events[0].message).toBe("reintentando")
  })

  it("mapea gateway_status 'down' a 'failed'", () => {
    const result = normalizePaymentsIntegration({ ...raw, gateway_status: "down" })
    expect(result.status).toBe("failed")
  })
})

describe("normalizeLogisticsIntegration", () => {
  const raw: RawLogisticsIntegration = {
    id: "int-2",
    tenantId: "tenant-1",
    carrierName: "Andreani",
    lastUpdate: "2026-01-01T00:00:00.000Z",
    shipmentsProcessed: 5,
    connectionHealth: "disconnected",
    history: [],
  }

  it("mapea connectionHealth 'disconnected' a 'failed'", () => {
    const result = normalizeLogisticsIntegration(raw)
    expect(result.status).toBe("failed")
  })

  it("usa el id y el nombre del carrier tal cual", () => {
    const result = normalizeLogisticsIntegration(raw)
    expect(result.id).toBe("int-2")
    expect(result.name).toBe("Andreani")
  })
})

describe("normalizeErpIntegration", () => {
  const baseRaw: RawErpIntegration = {
    code: "int-3",
    tenant: "tenant-1",
    label: "SAP",
    meta: { lastRun: "2026-01-01T00:00:00.000Z", rowsAffected: 3, healthy: false, hasPendingRetries: true },
    runs: [],
  }

  it("es 'retrying' cuando no es saludable pero tiene reintentos pendientes", () => {
    const result = normalizeErpIntegration(baseRaw)
    expect(result.status).toBe("retrying")
  })

  it("es 'failed' cuando no es saludable y no hay reintentos pendientes", () => {
    const result = normalizeErpIntegration({
      ...baseRaw,
      meta: { ...baseRaw.meta, hasPendingRetries: false },
    })
    expect(result.status).toBe("failed")
  })

  it("es 'up_to_date' cuando es saludable", () => {
    const result = normalizeErpIntegration({
      ...baseRaw,
      meta: { ...baseRaw.meta, healthy: true },
    })
    expect(result.status).toBe("up_to_date")
  })
})

describe("normalizeMarketplaceIntegration", () => {
  const raw: RawMarketplaceIntegration = {
    seller_id: "int-4",
    tenant_ref: "tenant-1",
    marketplace: "Mercado Libre",
    sync: { state: "throttled", last_sync_ms: 1_700_000_000_000, items_published: 42 },
    activity: [{ at_ms: 1_700_000_000_000, state: "throttled", text: "límite de requests alcanzado" }],
  }

  it("mapea los campos propios del marketplace al modelo común", () => {
    const result = normalizeMarketplaceIntegration(raw)

    expect(result).toMatchObject({
      id: "int-4",
      tenantId: "tenant-1",
      name: "Mercado Libre",
      kind: "marketplace",
      recordsSynced: 42,
    })
  })

  it("convierte los milisegundos a ISO sin confundirlos con segundos", () => {
    const result = normalizeMarketplaceIntegration(raw)

    expect(result.lastSyncedAt).toBe(new Date(1_700_000_000_000).toISOString())
    expect(result.events[0].timestamp).toBe(new Date(1_700_000_000_000).toISOString())
  })

  it.each([
    ["synced", "up_to_date"],
    ["throttled", "retrying"],
    ["suspended", "failed"],
  ] as const)("mapea el estado '%s' a '%s'", (state, expected) => {
    const result = normalizeMarketplaceIntegration({ ...raw, sync: { ...raw.sync, state } })

    expect(result.status).toBe(expected)
  })
})
