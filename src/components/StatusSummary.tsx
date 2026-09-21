import { STATUS_STYLES } from "~/components/StatusBadge"
import type { Integration, SyncStatus } from "~/lib/types"

const STATUS_ORDER: SyncStatus[] = ["up_to_date", "retrying", "failed"]

interface StatusSummaryProps {
  integrations: Integration[]
  isLoading: boolean
}

function describe(counts: Record<SyncStatus, number>, total: number): { text: string; tone: string } {
  if (counts.failed > 0) {
    return {
      text: `${counts.failed} ${counts.failed === 1 ? "integración" : "integraciones"} con error`,
      tone: "text-fail",
    }
  }
  if (counts.retrying > 0) {
    return {
      text: `${counts.retrying} ${counts.retrying === 1 ? "integración" : "integraciones"} con reintentos`,
      tone: "text-warn",
    }
  }
  if (total > 0) return { text: "Todo al día", tone: "text-ink" }
  return { text: "Sin integraciones", tone: "text-muted" }
}

export function StatusSummary({ integrations, isLoading }: StatusSummaryProps) {
  if (isLoading) {
    return (
      <section aria-label="Resumen de estado" aria-busy="true">
        <div className="bg-sunken h-9 w-72 max-w-full rounded-lg motion-safe:animate-pulse" />
        <div className="bg-sunken mt-3 h-5 w-56 max-w-full rounded-lg motion-safe:animate-pulse" />
      </section>
    )
  }

  const counts = STATUS_ORDER.reduce(
    (acc, status) => ({ ...acc, [status]: integrations.filter((item) => item.status === status).length }),
    {} as Record<SyncStatus, number>,
  )
  const headline = describe(counts, integrations.length)

  return (
    <section aria-label="Resumen de estado">
      <p className={`text-2xl font-semibold tracking-tight sm:text-3xl ${headline.tone}`}>{headline.text}</p>
      <dl className="text-muted mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {STATUS_ORDER.map((status) => (
          <div key={status} className="flex items-baseline gap-1.5">
            <dt>{STATUS_STYLES[status].label}</dt>
            <dd className="text-ink font-mono tabular-nums">{counts[status]}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
