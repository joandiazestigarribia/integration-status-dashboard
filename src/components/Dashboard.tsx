"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { MotionConfig } from "framer-motion"
import { getIntegrations, retryIntegration } from "~/lib/api"
import type { Integration, SyncStatus, Tenant } from "~/lib/types"
import { TenantSelector } from "~/components/TenantSelector"
import { StatusSummary } from "~/components/StatusSummary"
import { IntegrationCard } from "~/components/IntegrationCard"
import { IntegrationDetail } from "~/components/IntegrationDetail"

const LAST_TENANT_KEY = "integration-dashboard:last-tenant"

const URGENCY: Record<SyncStatus, number> = { failed: 0, retrying: 1, up_to_date: 2 }

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
      setSelectedIntegrationId(pickMostUrgent(loaded)?.id ?? null)
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
    <MotionConfig reducedMotion="user">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8">
          <h1 className="text-lg font-semibold tracking-tight">Panel de sincronización</h1>
          <p className="text-muted mt-1 max-w-prose text-sm">
            Estado de las integraciones de pagos, logística y ERP por cliente.
          </p>
        </header>

        {tenants.length > 0 && selectedTenantId && (
          <div className="mb-8">
            <TenantSelector
              tenants={tenants}
              selectedTenantId={selectedTenantId}
              onSelect={handleSelectTenant}
            />
          </div>
        )}

        <div className="mb-8">
          <StatusSummary integrations={visibleIntegrations} isLoading={isLoading} />
        </div>

        <div className="grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div>
            {isLoading && (
              <>
                <p className="sr-only">Cargando integraciones…</p>
                <ul
                  aria-hidden
                  className="divide-line border-line divide-y overflow-hidden rounded-lg border"
                >
                  {[0, 1, 2].map((placeholder) => (
                    <li key={placeholder} className="bg-surface h-[92px] p-4">
                      <div className="bg-sunken h-4 w-40 max-w-full rounded-lg motion-safe:animate-pulse" />
                      <div className="bg-sunken mt-2 h-3 w-16 rounded-lg motion-safe:animate-pulse" />
                    </li>
                  ))}
                </ul>
              </>
            )}
            {!isLoading && visibleIntegrations.length === 0 && (
              <p className="text-muted text-sm">Este cliente todavía no tiene integraciones.</p>
            )}
            {!isLoading && visibleIntegrations.length > 0 && (
              <ul className="divide-line border-line bg-surface divide-y overflow-hidden rounded-lg border">
                {visibleIntegrations.map((integration) => (
                  <li key={integration.id}>
                    <IntegrationCard
                      integration={integration}
                      isSelected={integration.id === selectedIntegrationId}
                      onSelect={() => setSelectedIntegrationId(integration.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="md:sticky md:top-6 md:self-start">
            {selectedIntegration && (
              <IntegrationDetail
                key={selectedIntegration.id}
                integration={selectedIntegration}
                onRetry={handleRetry}
              />
            )}
          </div>
        </div>
      </div>
    </MotionConfig>
  )
}

function pickMostUrgent(integrations: Integration[]): Integration | null {
  return integrations.reduce<Integration | null>(
    (most, item) => (most === null || URGENCY[item.status] < URGENCY[most.status] ? item : most),
    null,
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
  } catch {}
}
