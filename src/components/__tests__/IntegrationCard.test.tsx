import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntegrationCard } from "~/components/IntegrationCard"
import type { Integration } from "~/lib/types"

const integration: Integration = {
  id: "int-1",
  tenantId: "tenant-1",
  name: "Mercado Pago",
  kind: "payments",
  status: "up_to_date",
  lastSyncedAt: "2026-01-01T00:00:00.000Z",
  recordsSynced: 1284,
  events: [],
}

describe("IntegrationCard", () => {
  it("muestra el tipo, el nombre, el estado y la última corrida", () => {
    render(<IntegrationCard integration={integration} isSelected={false} onSelect={jest.fn()} />)
    expect(screen.getByText("Pagos")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Mercado Pago" })).toBeInTheDocument()
    expect(screen.getByText("Al día")).toBeInTheDocument()
    expect(screen.getByText(/Última corrida/)).toBeInTheDocument()
  })

  it("llama a onSelect al clickear", async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    render(<IntegrationCard integration={integration} isSelected={false} onSelect={onSelect} />)

    await user.click(screen.getByRole("button"))

    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
