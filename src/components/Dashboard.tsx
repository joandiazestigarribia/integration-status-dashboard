"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { MotionConfig } from "framer-motion"
import { getIntegrations, retryIntegration } from "~/lib/api"
import type { Integration, SyncStatus, Tenant } from "~/lib/types"
import { TenantSelector } from "~/components/TenantSelector"
import { StatusSummary } from "~/components/StatusSummary"
import { IntegrationCard } from "~/components/IntegrationCard"
import { IntegrationDetail } from "~/components/IntegrationDetail"
import { formatTimeAgo } from "~/lib/format"
import { useOnlineStatus } from "~/lib/use-online-status"

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
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null)
  const [loadFailure, setLoadFailure] = useState<{ tenantId: string; token: number } | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const isOnline = useOnlineStatus()

  useEffect(() => {
    if (!selectedTenantId) return
    const controller = new AbortController()

    getIntegrations(selectedTenantId, { signal: controller.signal })
      .then(({ integrations: loaded, fetchedAt: loadedAt }) => {
        if (controller.signal.aborted) return
        setLoadFailure(null)
        setIntegrations(loaded)
        setIntegrationsTenantId(selectedTenantId)
        setFetchedAt(loadedAt)
        setSelectedIntegrationId(pickMostUrgent(loaded)?.id ?? null)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setLoadFailure({ tenantId: selectedTenantId, token: reloadToken })
      })

    return () => controller.abort()
  }, [selectedTenantId, reloadToken])

  const isLoading = selectedTenantId !== null && selectedTenantId !== integrationsTenantId
  const hasError =
    loadFailure !== null && loadFailure.tenantId === selectedTenantId && loadFailure.token === reloadToken
  const visibleIntegrations = isLoading ? [] : integrations
  const freshnessLabel = !isLoading && !hasError && fetchedAt ? formatTimeAgo(fetchedAt) : null

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
            Estado de las integraciones de pagos, logística, ERP y marketplaces por cliente.
          </p>
        </header>

        {!isOnline && (
          <p
            role="status"
            className="border-line bg-sunken text-muted mb-8 rounded-lg border px-4 py-2 text-sm"
          >
            Sin conexión: estás viendo el último estado guardado de cada integración.
          </p>
        )}

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
          {freshnessLabel && fetchedAt && (
            <p className="text-muted mt-2 text-xs">
              Estado actualizado{" "}
              <time dateTime={fetchedAt} className="font-mono tabular-nums">
                {freshnessLabel}
              </time>
            </p>
          )}
        </div>

        <div className="grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div>
            {hasError && (
              <div className="border-line bg-surface rounded-lg border p-5">
                <p className="text-fail text-sm" role="alert">
                  No se pudieron cargar las integraciones de este cliente.
                </p>
                <button
                  type="button"
                  onClick={() => setReloadToken((token) => token + 1)}
                  className="bg-ink text-canvas mt-4 rounded-lg px-4 py-2 text-sm font-medium transition duration-150 hover:opacity-90 active:translate-y-px"
                >
                  Reintentar carga
                </button>
              </div>
            )}
            {isLoading && !hasError && (
              <>
                <p className="sr-only" role="status">
                  Cargando integraciones…
                </p>
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
            {!hasError && !isLoading && visibleIntegrations.length === 0 && (
              <p className="text-muted text-sm">Este cliente todavía no tiene integraciones.</p>
            )}
            {!hasError && !isLoading && visibleIntegrations.length > 0 && (
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
