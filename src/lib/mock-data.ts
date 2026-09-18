import type {
  RawErpIntegration,
  RawLogisticsIntegration,
  RawPaymentsIntegration,
} from "~/lib/adapters/raw-types"
import type { Tenant } from "~/lib/types"

/**
 * Datos de ejemplo, con nombres de cliente/plataforma inventados. No hay
 * acá ninguna lógica de negocio real: es solo lo necesario para que el
 * dashboard tenga algo que mostrar por tenant.
 */

export const tenants: Tenant[] = [
  { id: "tenant-aurora", name: "Aurora Retail", platform: "vtex" },
  { id: "tenant-bravo", name: "Bravo Foods", platform: "shopify" },
  { id: "tenant-cedro", name: "Cedro Logística", platform: "custom" },
]

const now = Date.now()
const hoursAgo = (h: number) => Math.floor((now - h * 3_600_000) / 1000)
const isoHoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString()

export const rawPaymentsByTenant: Record<string, RawPaymentsIntegration> = {
  "tenant-aurora": {
    integration_id: "aurora-payments",
    tenant_id: "tenant-aurora",
    display_name: "Mercado Pago",
    last_sync_unix: hoursAgo(0.2),
    synced_count: 1284,
    gateway_status: "ok",
    log: [
      { ts_unix: hoursAgo(0.2), state: "ok", detail: "Sincronización completa" },
      { ts_unix: hoursAgo(6), state: "degraded", detail: "Timeout en 3 transacciones, reintento automático" },
      { ts_unix: hoursAgo(24), state: "ok", detail: "Sincronización completa" },
    ],
  },
  "tenant-bravo": {
    integration_id: "bravo-payments",
    tenant_id: "tenant-bravo",
    display_name: "Stripe",
    last_sync_unix: hoursAgo(1),
    synced_count: 542,
    gateway_status: "degraded",
    log: [
      { ts_unix: hoursAgo(1), state: "degraded", detail: "Reintentando webhook de confirmación" },
      { ts_unix: hoursAgo(3), state: "ok", detail: "Sincronización completa" },
    ],
  },
  "tenant-cedro": {
    integration_id: "cedro-payments",
    tenant_id: "tenant-cedro",
    display_name: "MODO",
    last_sync_unix: hoursAgo(48),
    synced_count: 0,
    gateway_status: "down",
    log: [
      { ts_unix: hoursAgo(48), state: "down", detail: "Credenciales rechazadas por el gateway" },
      { ts_unix: hoursAgo(50), state: "degraded", detail: "Latencia elevada" },
    ],
  },
}

export const rawLogisticsByTenant: Record<string, RawLogisticsIntegration> = {
  "tenant-aurora": {
    id: "aurora-logistics",
    tenantId: "tenant-aurora",
    carrierName: "Andreani",
    lastUpdate: isoHoursAgo(0.5),
    shipmentsProcessed: 318,
    connectionHealth: "connected",
    history: [
      { at: isoHoursAgo(0.5), health: "connected", note: "318 envíos actualizados" },
      { at: isoHoursAgo(12), health: "connected", note: "290 envíos actualizados" },
    ],
  },
  "tenant-bravo": {
    id: "bravo-logistics",
    tenantId: "tenant-bravo",
    carrierName: "Correo Argentino",
    lastUpdate: isoHoursAgo(2),
    shipmentsProcessed: 97,
    connectionHealth: "reconnecting",
    history: [
      { at: isoHoursAgo(2), health: "reconnecting", note: "Reestableciendo conexión con el carrier" },
      { at: isoHoursAgo(5), health: "connected", note: "97 envíos actualizados" },
    ],
  },
  "tenant-cedro": {
    id: "cedro-logistics",
    tenantId: "tenant-cedro",
    carrierName: "Glovo LATAM",
    lastUpdate: isoHoursAgo(0.1),
    shipmentsProcessed: 1502,
    connectionHealth: "connected",
    history: [{ at: isoHoursAgo(0.1), health: "connected", note: "1502 envíos actualizados" }],
  },
}

export const rawErpByTenant: Record<string, RawErpIntegration> = {
  "tenant-aurora": {
    code: "aurora-erp",
    tenant: "tenant-aurora",
    label: "SAP Business One",
    meta: { lastRun: isoHoursAgo(4), rowsAffected: 812, healthy: true, hasPendingRetries: false },
    runs: [
      {
        when: isoHoursAgo(4),
        healthy: true,
        hasPendingRetries: false,
        summary: "812 registros sincronizados",
      },
    ],
  },
  "tenant-bravo": {
    code: "bravo-erp",
    tenant: "tenant-bravo",
    label: "NetSuite",
    meta: { lastRun: isoHoursAgo(30), rowsAffected: 12, healthy: false, hasPendingRetries: true },
    runs: [
      {
        when: isoHoursAgo(30),
        healthy: false,
        hasPendingRetries: true,
        summary: "Timeout al leer catálogo, reintentando",
      },
      {
        when: isoHoursAgo(31),
        healthy: true,
        hasPendingRetries: false,
        summary: "180 registros sincronizados",
      },
    ],
  },
  "tenant-cedro": {
    code: "cedro-erp",
    tenant: "tenant-cedro",
    label: "Odoo",
    meta: { lastRun: isoHoursAgo(1), rowsAffected: 240, healthy: true, hasPendingRetries: false },
    runs: [
      {
        when: isoHoursAgo(1),
        healthy: true,
        hasPendingRetries: false,
        summary: "240 registros sincronizados",
      },
    ],
  },
}
