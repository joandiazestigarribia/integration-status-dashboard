import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntegrationDetail } from "~/components/IntegrationDetail"
import type { Integration } from "~/lib/types"

const integration: Integration = {
  id: "int-1",
  tenantId: "tenant-1",
  name: "Mercado Pago",
  kind: "payments",
  status: "retrying",
  lastSyncedAt: "2026-01-01T00:00:00.000Z",
  recordsSynced: 100,
  events: [
    { id: "evt-1", timestamp: "2026-01-01T00:00:00.000Z", status: "retrying", message: "reintentando" },
  ],
}

describe("IntegrationDetail", () => {
  it("muestra el nombre, el estado y la línea de tiempo", () => {
    render(<IntegrationDetail integration={integration} onRetry={jest.fn()} />)
    expect(screen.getByRole("heading", { name: "Mercado Pago" })).toBeInTheDocument()
    expect(screen.getByText("reintentando")).toBeInTheDocument()
  })

  it("deshabilita 'Reintentar' cuando la integración ya está al día", () => {
    render(<IntegrationDetail integration={{ ...integration, status: "up_to_date" }} onRetry={jest.fn()} />)
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeDisabled()
  })

  it("llama a onRetry y muestra 'Reintentando…' mientras está pendiente", async () => {
    const user = userEvent.setup()
    let resolveRetry: () => void = () => {}
    const onRetry = jest.fn(() => new Promise<void>((resolve) => (resolveRetry = resolve)))

    render(<IntegrationDetail integration={integration} onRetry={onRetry} />)
    await user.click(screen.getByRole("button", { name: "Reintentar" }))

    expect(onRetry).toHaveBeenCalledWith(integration)
    expect(screen.getByRole("button", { name: "Reintentando…" })).toBeDisabled()

    resolveRetry()
    expect(await screen.findByRole("button", { name: "Reintentar" })).toBeEnabled()
  })

  it("muestra un error si onRetry rechaza, y lo limpia en el siguiente intento", async () => {
    const user = userEvent.setup()
    const onRetry = jest.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(undefined)

    render(<IntegrationDetail integration={integration} onRetry={onRetry} />)

    await user.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo reintentar")

    await user.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})
