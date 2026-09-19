"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { getIntegrations, retryIntegration } from "~/lib/api"
import type { Integration, Tenant } from "~/lib/types"
import { TenantSelector } from "~/components/TenantSelector"
import { IntegrationCard } from "~/components/IntegrationCard"
import { IntegrationDetail } from "~/components/IntegrationDetail"

const LAST_TENANT_KEY = "integration-dashboard:last-tenant"

interface DashboardProps {
  tenants: Tenant[]
}

export function Dashboard({ tenants }: DashboardProps) {
  const rememberedTenantId = useSyncExternalStore(subscribeToNothing, safeReadLastTenant, () => null)
  const [chosenTenantId, setChosenTenantId] = useState<string | null>(null)
  const fallbackTenantId = tenants.some((tenant) => tenant.id === rememberedTenantId)
    ? rememberedTenantId
    : (tenants[0]?.id ?? null)
  const selectedTenantId = chosenTenantId ?? fallbackTenantId
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [integrationsTenantId, setIntegrationsTenantId] = useState<string | null>(null)
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedTenantId) return
    let isCurrent = true

    getIntegrations(selectedTenantId).then((loaded) => {
      if (!isCurrent) return
      setIntegrations(loaded)
      setIntegrationsTenantId(selectedTenantId)
      setSelectedIntegrationId(null)
    })

    return () => {
      isCurrent = false
    }
  }, [selectedTenantId])

  const isLoading = selectedTenantId !== null && selectedTenantId !== integrationsTenantId
  const visibleIntegrations = isLoading ? [] : integrations

  function handleSelectTenant(tenantId: string) {
    safeWriteLastTenant(tenantId)
    setChosenTenantId(tenantId)
  }

  async function handleRetry(integration: Integration) {
    const updated = await retryIntegration(integration)
    setIntegrations((current) => current.map((item) => (item.id === updated.id ? updated : item)))
  }

  const selectedIntegration = visibleIntegrations.find((item) => item.id === selectedIntegrationId) ?? null

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Panel de sincronización
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Estado de las integraciones de pagos, logística y ERP por cliente.
        </p>
      </header>

      {tenants.length > 0 && selectedTenantId && (
        <div className="mb-6">
          <TenantSelector
            tenants={tenants}
            selectedTenantId={selectedTenantId}
            onSelect={handleSelectTenant}
          />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          {isLoading && <p className="text-sm text-neutral-500">Cargando integraciones…</p>}
          {!isLoading &&
            visibleIntegrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                isSelected={integration.id === selectedIntegrationId}
                onSelect={() => setSelectedIntegrationId(integration.id)}
              />
            ))}
        </div>

        <div>
          {selectedIntegration ? (
            <IntegrationDetail
              key={selectedIntegration.id}
              integration={selectedIntegration}
              onRetry={handleRetry}
            />
          ) : (
            <p className="text-sm text-neutral-500">Elegí una integración para ver el detalle.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function subscribeToNothing(): () => void {
  return () => {}
}

function safeReadLastTenant(): string | null {
  try {
    return window.localStorage.getItem(LAST_TENANT_KEY)
  } catch {
    return null
  }
}

function safeWriteLastTenant(tenantId: string): void {
  try {
    window.localStorage.setItem(LAST_TENANT_KEY, tenantId)
  } catch {
  }
}
