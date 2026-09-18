/**
 * Modelo de dominio, ya normalizado.
 *
 * Todo lo que vive en `lib/adapters` existe para transformar las formas
 * "crudas" que devolvería cada integración real (pagos, logística, ERP)
 * en ESTE modelo común. La UI y los componentes solo conocen este tipo:
 * nunca les llega una forma cruda directamente.
 */

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
  /**
   * Plataforma de e-commerce del cliente. No cambia cómo se ve el dashboard:
   * solo documenta que cada integración de este tenant fue normalizada
   * desde un formato distinto (ver `lib/adapters`).
   */
  platform: "vtex" | "shopify" | "custom"
}
