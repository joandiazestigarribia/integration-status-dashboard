"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { EventTimeline } from "~/components/EventTimeline"
import { StatusBadge } from "~/components/StatusBadge"
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
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{integration.name}</h2>
          <StatusBadge status={integration.status} />
        </div>
        <button
          type="button"
          onClick={handleRetry}
          disabled={isRetrying || integration.status === "up_to_date"}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300"
        >
          {isRetrying ? "Reintentando…" : "Reintentar"}
        </button>
      </div>

      {hasError && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
          No se pudo reintentar. Probá de nuevo.
        </p>
      )}

      <h3 className="mt-5 mb-2 text-sm font-medium text-neutral-500">Línea de tiempo</h3>
      <EventTimeline events={integration.events} />
    </motion.div>
  )
}
