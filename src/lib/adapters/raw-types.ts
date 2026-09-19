export interface RawPaymentsIntegration {
  integration_id: string
  tenant_id: string
  display_name: string
  last_sync_unix: number
  synced_count: number
  gateway_status: "ok" | "degraded" | "down"
  log: Array<{ ts_unix: number; state: "ok" | "degraded" | "down"; detail: string }>
}

export interface RawLogisticsIntegration {
  id: string
  tenantId: string
  carrierName: string
  lastUpdate: string // ISO
  shipmentsProcessed: number
  connectionHealth: "connected" | "reconnecting" | "disconnected"
  history: Array<{ at: string; health: "connected" | "reconnecting" | "disconnected"; note: string }>
}

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
