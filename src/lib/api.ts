import {
  normalizeErpIntegration,
  normalizeLogisticsIntegration,
  normalizePaymentsIntegration,
  sortEventsDesc,
} from "~/lib/adapters/normalize"
import { rawErpByTenant, rawLogisticsByTenant, rawPaymentsByTenant, tenants } from "~/lib/mock-data"
import type { Integration, Tenant } from "~/lib/types"

/**
 * Capa de acceso a datos simulada. En una app real, esto sería una llamada
 * `fetch` a un backend (el tipo de servicio que mantiene un middleware de
 * integraciones); acá se simula latencia de red para que el resto del
 * front (loading states, skeletons) se comporte igual que con datos reales.
 */

const NETWORK_DELAY_MS = 350

function delay<T>(value: T, ms = NETWORK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export async function getTenants(): Promise<Tenant[]> {
  return delay(tenants)
}

export async function getIntegrations(tenantId: string): Promise<Integration[]> {
  const payments = rawPaymentsByTenant[tenantId]
  const logistics = rawLogisticsByTenant[tenantId]
  const erp = rawErpByTenant[tenantId]

  const integrations: Integration[] = []
  if (payments) integrations.push(normalizePaymentsIntegration(payments))
  if (logistics) integrations.push(normalizeLogisticsIntegration(logistics))
  if (erp) integrations.push(normalizeErpIntegration(erp))

  return delay(
    integrations.map((integration) => ({ ...integration, events: sortEventsDesc(integration.events) })),
  )
}

/**
 * Simula reintentar una sincronización: dos de cada tres intentos
 * "resuelven" el problema. Devuelve la integración actualizada con un
 * evento nuevo al principio de la línea de tiempo.
 */
export async function retryIntegration(integration: Integration): Promise<Integration> {
  const succeeds = Math.random() > 0.33
  const timestamp = new Date().toISOString()

  const updated: Integration = {
    ...integration,
    status: succeeds ? "up_to_date" : "retrying",
    lastSyncedAt: succeeds ? timestamp : integration.lastSyncedAt,
    events: [
      {
        id: `${integration.id}-evt-retry-${timestamp}`,
        timestamp,
        status: succeeds ? "up_to_date" : "retrying",
        message: succeeds ? "Reintento exitoso" : "Reintento en curso, todavía sin confirmación",
      },
      ...integration.events,
    ],
  }

  return delay(updated, 700)
}
