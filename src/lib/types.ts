export type IntegrationKind = "payments" | "logistics" | "erp" | "marketplace"

export type SyncStatus = "up_to_date" | "retrying" | "failed"

export interface SyncEvent {
  id: string
  timestamp: string // ISO 8601
  status: SyncStatus
  message: string
}

export interface Integration {
  id: string
  tenantId: string
  name: string
  kind: IntegrationKind
  status: SyncStatus
  lastSyncedAt: string // ISO 8601
  recordsSynced: number
  events: SyncEvent[]
}

export interface Tenant {
  id: string
  name: string
  platform: "vtex" | "shopify" | "custom"
}
