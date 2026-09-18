/**
 * Formas "crudas" simuladas: cada una imita cómo respondería una
 * integración real, con su propio formato de fechas, nombres de campo y
 * vocabulario de estados. Son intencionalmente distintas entre sí: la idea
 * es normalizarlas en un solo lugar (ver `normalize.ts`), no en cada
 * componente.
 */

/** Estilo "pasarela de pagos": snake_case, timestamp unix, estados propios. */
export interface RawPaymentsIntegration {
  integration_id: string
  tenant_id: string
  display_name: string
  last_sync_unix: number
  synced_count: number
  gateway_status: "ok" | "degraded" | "down"
  log: Array<{ ts_unix: number; state: "ok" | "degraded" | "down"; detail: string }>
}

/** Estilo "carrier de logística": camelCase, ISO date, estados distintos otra vez. */
export interface RawLogisticsIntegration {
  id: string
  tenantId: string
  carrierName: string
  lastUpdate: string // ISO
  shipmentsProcessed: number
  connectionHealth: "connected" | "reconnecting" | "disconnected"
  history: Array<{ at: string; health: "connected" | "reconnecting" | "disconnected"; note: string }>
}

/** Estilo "ERP": todo dentro de un objeto `meta`, booleano en vez de enum. */
export interface RawErpIntegration {
  code: string
  tenant: string
  label: string
  meta: {
    lastRun: string
    rowsAffected: number
    healthy: boolean
    hasPendingRetries: boolean
  }
  runs: Array<{ when: string; healthy: boolean; hasPendingRetries: boolean; summary: string }>
}
