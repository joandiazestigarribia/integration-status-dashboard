"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { EventTimeline } from "~/components/EventTimeline"
import { StatusBadge } from "~/components/StatusBadge"
import { formatDateTime } from "~/lib/format"
import type { Integration } from "~/lib/types"

interface IntegrationDetailProps {
  integration: Integration
  onRetry: (integration: Integration) => Promise<void>
}

export function IntegrationDetail({ integration, onRetry }: IntegrationDetailProps) {
  const [isRetrying, setIsRetrying] = useState(false)
  const [hasError, setHasError] = useState(false)

  async function handleRetry() {
    setIsRetrying(true)
    setHasError(false)
    try {
      await onRetry(integration)
    } catch {
      setHasError(true)
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="border-line bg-surface rounded-lg border p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight break-words">{integration.name}</h2>
          <div className="mt-1">
            <StatusBadge status={integration.status} />
          </div>
        </div>
        <button
          type="button"
          onClick={handleRetry}
          disabled={isRetrying || integration.status === "up_to_date"}
          className="bg-ink text-canvas shrink-0 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition duration-150 hover:opacity-90 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0"
        >
          {isRetrying ? "Reintentando…" : "Reintentar"}
        </button>
      </div>

      {hasError && (
        <p className="text-fail mt-3 text-sm" role="alert">
          No se pudo reintentar. Probá de nuevo.
        </p>
      )}

      <dl className="border-line mt-5 grid grid-cols-2 gap-4 border-t pt-5 text-sm">
        <div>
          <dt className="text-muted">Última corrida</dt>
          <dd className="mt-0.5 font-mono tabular-nums">
            <time className="whitespace-nowrap" dateTime={integration.lastSyncedAt}>
              {formatDateTime(integration.lastSyncedAt)}
            </time>
          </dd>
        </div>
        <div>
          <dt className="text-muted">Registros sincronizados</dt>
          <dd className="mt-0.5 font-mono tabular-nums">
            {integration.recordsSynced.toLocaleString("es-AR")}
          </dd>
        </div>
      </dl>

      <h3 className="mt-6 mb-4 text-sm font-semibold">Línea de tiempo</h3>
      <EventTimeline events={integration.events} />
    </motion.div>
  )
}
