export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short", hourCycle: "h23" })
}
