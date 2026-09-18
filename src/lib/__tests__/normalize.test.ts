import {
  normalizeErpIntegration,
  normalizeLogisticsIntegration,
  normalizePaymentsIntegration,
} from "~/lib/adapters/normalize"
import type {
  RawErpIntegration,
  RawLogisticsIntegration,
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
