import { formatDateTime, formatTimeAgo } from "~/lib/format"

describe("formatDateTime", () => {
  it("muestra fecha y hora sin segundos", () => {
    const formatted = formatDateTime("2026-01-15T12:34:56.000Z")

    expect(formatted).toContain("2026")
    expect(formatted).not.toContain(":56")
  })
})

describe("formatTimeAgo", () => {
  const now = new Date("2026-01-15T12:00:00.000Z").getTime()
  const ago = (ms: number) => new Date(now - ms).toISOString()

  it("muestra 'hace instantes' para menos de un minuto", () => {
    expect(formatTimeAgo(ago(30_000), now)).toBe("hace instantes")
  })

  it("muestra minutos", () => {
    expect(formatTimeAgo(ago(5 * 60_000), now)).toBe("hace 5 min")
  })

  it("muestra horas", () => {
    expect(formatTimeAgo(ago(3 * 3_600_000), now)).toBe("hace 3 h")
  })

  it("muestra días en singular y plural", () => {
    expect(formatTimeAgo(ago(24 * 3_600_000), now)).toBe("hace 1 día")
    expect(formatTimeAgo(ago(3 * 24 * 3_600_000), now)).toBe("hace 3 días")
  })

  it("devuelve una cadena vacía si la fecha es inválida", () => {
    expect(formatTimeAgo("no-es-una-fecha", now)).toBe("")
  })
})
