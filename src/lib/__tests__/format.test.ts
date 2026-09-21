import { formatDateTime } from "~/lib/format"

describe("formatDateTime", () => {
  it("muestra fecha y hora sin segundos", () => {
    const formatted = formatDateTime("2026-01-15T12:34:56.000Z")

    expect(formatted).toContain("2026")
    expect(formatted).not.toContain(":56")
  })
})
