import { STATUS_STYLES } from "~/components/StatusBadge"
import { formatDateTime } from "~/lib/format"
import type { SyncEvent } from "~/lib/types"

export function EventTimeline({ events }: { events: SyncEvent[] }) {
  if (events.length === 0) {
    return <p className="text-muted text-sm">Todavía no hay eventos registrados.</p>
  }

  return (
    <ol className="border-line relative ml-1 space-y-5 border-l pl-5">
      {events.map((event) => {
        const style = STATUS_STYLES[event.status]
        return (
          <li key={event.id} className="relative">
            <span
              aria-hidden
              className={`ring-surface absolute top-1.5 -left-[25px] h-2.5 w-2.5 rounded-full ring-4 ${style.dot}`}
            />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className={`text-sm font-medium ${style.text}`}>{style.label}</span>
              <time
                className="text-muted font-mono text-xs whitespace-nowrap tabular-nums"
                dateTime={event.timestamp}
              >
                {formatDateTime(event.timestamp)}
              </time>
            </div>
            <p className="mt-1 text-sm">{event.message}</p>
          </li>
        )
      })}
    </ol>
  )
}
