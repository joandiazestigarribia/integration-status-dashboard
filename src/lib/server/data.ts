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

export function listTenants(): Tenant[] {
  return tenants
}

export function findTenant(tenantId: string): Tenant | undefined {
  return tenants.find((tenant) => tenant.id === tenantId)
}

export function listIntegrations(tenantId: string): Integration[] {
  const payments = rawPaymentsByTenant[tenantId]
  const logistics = rawLogisticsByTenant[tenantId]
  const erp = rawErpByTenant[tenantId]
  const marketplace = rawMarketplaceByTenant[tenantId]

  const integrations: Integration[] = []
  if (payments) integrations.push(normalizePaymentsIntegration(payments))
  if (logistics) integrations.push(normalizeLogisticsIntegration(logistics))
  if (erp) integrations.push(normalizeErpIntegration(erp))
  if (marketplace) integrations.push(normalizeMarketplaceIntegration(marketplace))

  return integrations.map((integration) => ({
    ...integration,
    events: sortEventsDesc(integration.events),
  }))
}

export function hasIntegration(tenantId: string, integrationId: string): boolean {
  return listIntegrations(tenantId).some((integration) => integration.id === integrationId)
}

export function applyRetry(integration: Integration): Integration {
  const succeeds = Math.random() > 0.33
  const timestamp = new Date().toISOString()

  return {
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
}
