"use client"

import { motion } from "framer-motion"
import { StatusBadge } from "~/components/StatusBadge"
import type { Integration } from "~/lib/types"

const KIND_LABEL: Record<Integration["kind"], string> = {
  payments: "Pagos",
  logistics: "Logística",
  erp: "ERP",
}

interface IntegrationCardProps {
  integration: Integration
  onSelect: () => void
  isSelected: boolean
}

export function IntegrationCard({ integration, onSelect, isSelected }: IntegrationCardProps) {
  return (
    <motion.button
      type="button"
      layout
      onClick={onSelect}
      className={`w-full rounded-xl border p-4 text-left transition-colors ${
        isSelected
          ? "border-neutral-900 dark:border-white"
          : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs tracking-wide text-neutral-500 uppercase">{KIND_LABEL[integration.kind]}</p>
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-50">{integration.name}</h3>
        </div>
        <StatusBadge status={integration.status} />
      </div>
      <dl className="mt-3 flex gap-4 text-sm text-neutral-500">
        <div>
          <dt className="sr-only">Última sincronización</dt>
          <dd>Última corrida: {new Date(integration.lastSyncedAt).toLocaleString("es-AR")}</dd>
        </div>
      </dl>
      <p className="mt-1 text-sm text-neutral-500">
        {integration.recordsSynced.toLocaleString("es-AR")} registros
      </p>
    </motion.button>
  )
}
