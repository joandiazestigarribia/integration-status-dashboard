export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short", hourCycle: "h23" })
}

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

export function formatTimeAgo(iso: string, now: number = Date.now()): string {
  const elapsed = now - new Date(iso).getTime()
  if (Number.isNaN(elapsed)) return ""

  const abs = Math.abs(elapsed)
  if (abs < MINUTE_MS) return "hace instantes"
  if (abs < HOUR_MS) return `hace ${Math.round(abs / MINUTE_MS)} min`
  if (abs < DAY_MS) return `hace ${Math.round(abs / HOUR_MS)} h`

  const days = Math.round(abs / DAY_MS)
  return `hace ${days} ${days === 1 ? "día" : "días"}`
}
