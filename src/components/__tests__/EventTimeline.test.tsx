import { render, screen } from "@testing-library/react"
import { EventTimeline } from "~/components/EventTimeline"
import type { SyncEvent } from "~/lib/types"

describe("EventTimeline", () => {
  it("muestra un mensaje cuando no hay eventos", () => {
    render(<EventTimeline events={[]} />)
    expect(screen.getByText("Todavía no hay eventos registrados.")).toBeInTheDocument()
  })

  it("renderiza cada evento con su estado y mensaje", () => {
    const events: SyncEvent[] = [
      {
        id: "evt-1",
        timestamp: "2026-01-02T00:00:00.000Z",
        status: "up_to_date",
        message: "sincronización ok",
      },
      {
        id: "evt-2",
        timestamp: "2026-01-01T00:00:00.000Z",
        status: "failed",
        message: "credenciales rechazadas",
      },
    ]

    render(<EventTimeline events={events} />)

    expect(screen.getByText("sincronización ok")).toBeInTheDocument()
    expect(screen.getByText("credenciales rechazadas")).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
  })
})
