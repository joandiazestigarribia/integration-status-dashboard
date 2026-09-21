import {
  normalizeErpIntegration,
  normalizeLogisticsIntegration,
  normalizeMarketplaceIntegration,
  normalizePaymentsIntegration,
  sortEventsDesc,
} from "~/lib/adapters/normalize"
import {
  rawErpByTenant,
  rawLogisticsByTenant,
  rawMarketplaceByTenant,
  rawPaymentsByTenant,
  tenants,
} from "~/lib/mock-data"
import type { Integration, Tenant } from "~/lib/types"

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
  const marketplace = rawMarketplaceByTenant[tenantId]

  const integrations: Integration[] = []
  if (payments) integrations.push(normalizePaymentsIntegration(payments))
  if (logistics) integrations.push(normalizeLogisticsIntegration(logistics))
  if (erp) integrations.push(normalizeErpIntegration(erp))
  if (marketplace) integrations.push(normalizeMarketplaceIntegration(marketplace))

  return delay(
    integrations.map((integration) => ({ ...integration, events: sortEventsDesc(integration.events) })),
  )
}

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
