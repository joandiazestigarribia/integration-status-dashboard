import { StatusBadge } from "~/components/StatusBadge"
import { formatDateTime } from "~/lib/format"
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
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`w-full px-4 py-4 text-left transition-colors ${
        isSelected ? "bg-sunken" : "hover:bg-sunken/60"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium break-words">{integration.name}</h3>
          <p className="text-muted mt-0.5 text-sm">{KIND_LABEL[integration.kind]}</p>
        </div>
        <StatusBadge status={integration.status} />
      </div>
      <p className="text-muted mt-3 text-xs">
        Última corrida{" "}
        <time className="font-mono whitespace-nowrap tabular-nums" dateTime={integration.lastSyncedAt}>
          {formatDateTime(integration.lastSyncedAt)}
        </time>
      </p>
    </button>
  )
}
