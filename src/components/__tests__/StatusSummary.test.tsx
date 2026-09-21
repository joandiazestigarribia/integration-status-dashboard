import { render, screen } from "@testing-library/react"
import { StatusSummary } from "~/components/StatusSummary"
import type { Integration, SyncStatus } from "~/lib/types"

function makeIntegration(id: string, status: SyncStatus): Integration {
  return {
    id,
    tenantId: "tenant-a",
    name: id,
    kind: "payments",
    status,
    lastSyncedAt: "2026-01-01T00:00:00.000Z",
    recordsSynced: 0,
    events: [],
  }
}

function countOf(label: string) {
  return screen.getByText(label).closest("div")
}

describe("StatusSummary", () => {
  it("prioriza los errores en el titular y cuenta cada estado", () => {
    const integrations = [
      makeIntegration("a", "up_to_date"),
      makeIntegration("b", "failed"),
      makeIntegration("c", "failed"),
      makeIntegration("d", "retrying"),
    ]

    render(<StatusSummary integrations={integrations} isLoading={false} />)

    expect(screen.getByText("2 integraciones con error")).toBeInTheDocument()
    expect(countOf("Al día")).toHaveTextContent("1")
    expect(countOf("Con reintentos")).toHaveTextContent("1")
    expect(countOf("Con error")).toHaveTextContent("2")
  })

  it("usa el singular cuando hay una sola integración con error", () => {
    render(<StatusSummary integrations={[makeIntegration("a", "failed")]} isLoading={false} />)

    expect(screen.getByText("1 integración con error")).toBeInTheDocument()
  })

  it("avisa de los reintentos cuando no hay errores", () => {
    const integrations = [makeIntegration("a", "up_to_date"), makeIntegration("b", "retrying")]

    render(<StatusSummary integrations={integrations} isLoading={false} />)

    expect(screen.getByText("1 integración con reintentos")).toBeInTheDocument()
  })

  it("dice 'Todo al día' cuando ninguna necesita atención", () => {
    render(<StatusSummary integrations={[makeIntegration("a", "up_to_date")]} isLoading={false} />)

    expect(screen.getByText("Todo al día")).toBeInTheDocument()
  })

  it("dice 'Sin integraciones' si el cliente no tiene ninguna", () => {
    render(<StatusSummary integrations={[]} isLoading={false} />)

    expect(screen.getByText("Sin integraciones")).toBeInTheDocument()
    expect(countOf("Con error")).toHaveTextContent("0")
  })

  it("marca la sección como ocupada y no muestra cifras mientras carga", () => {
    render(<StatusSummary integrations={[]} isLoading />)

    expect(screen.getByRole("region", { name: "Resumen de estado" })).toHaveAttribute("aria-busy", "true")
    expect(screen.queryByText("Sin integraciones")).not.toBeInTheDocument()
    expect(screen.queryByText("Con error")).not.toBeInTheDocument()
  })
})
