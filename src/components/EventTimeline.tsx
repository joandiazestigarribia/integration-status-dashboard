import { StatusBadge } from "~/components/StatusBadge"
import type { SyncEvent } from "~/lib/types"

export function EventTimeline({ events }: { events: SyncEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-neutral-500">Todavía no hay eventos registrados.</p>
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="border-l-2 border-neutral-200 pl-3 dark:border-neutral-800">
          <div className="flex items-center justify-between gap-2">
            <StatusBadge status={event.status} />
            <time className="text-xs text-neutral-500" dateTime={event.timestamp}>
              {new Date(event.timestamp).toLocaleString("es-AR")}
            </time>
          </div>
          <p className="mt-0.5 text-sm text-neutral-700 dark:text-neutral-300">{event.message}</p>
        </li>
      ))}
    </ol>
  )
}
