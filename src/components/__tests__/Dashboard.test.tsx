import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Dashboard } from "~/components/Dashboard"
import * as api from "~/lib/api"
import type { Integration, Tenant } from "~/lib/types"

jest.mock("~/lib/api")

const tenants: Tenant[] = [
  { id: "tenant-a", name: "Aurora Retail", platform: "vtex" },
  { id: "tenant-b", name: "Bravo Foods", platform: "shopify" },
]

function makeIntegration(overrides: Partial<Integration> = {}): Integration {
  return {
    id: "int-1",
    tenantId: "tenant-a",
    name: "Mercado Pago",
    kind: "payments",
    status: "up_to_date",
    lastSyncedAt: "2026-01-01T00:00:00.000Z",
    recordsSynced: 100,
    events: [],
    ...overrides,
  }
}

describe("Dashboard", () => {
  beforeEach(() => {
    window.localStorage.clear()
    jest.clearAllMocks()
    jest
      .mocked(api.getIntegrations)
      .mockImplementation(async (tenantId) => [makeIntegration({ id: `${tenantId}-int`, tenantId })])
  })

  it("selecciona el primer tenant por defecto y pide sus integraciones en un solo fetch", async () => {
    render(<Dashboard tenants={tenants} />)

    expect(screen.getByRole("button", { name: /Aurora Retail/i })).toHaveAttribute("aria-current", "true")
    expect(await screen.findByText("Mercado Pago")).toBeInTheDocument()
    expect(api.getIntegrations).toHaveBeenCalledTimes(1)
    expect(api.getIntegrations).toHaveBeenCalledWith("tenant-a")
  })

  it("recuerda el último tenant visto en localStorage", async () => {
    window.localStorage.setItem("integration-dashboard:last-tenant", "tenant-b")

    render(<Dashboard tenants={tenants} />)

    expect(await screen.findByRole("button", { name: /Bravo Foods/i })).toHaveAttribute(
      "aria-current",
      "true",
    )
    expect(await screen.findByText("Mercado Pago")).toBeInTheDocument()
    expect(api.getIntegrations).toHaveBeenCalledTimes(1)
    expect(api.getIntegrations).toHaveBeenCalledWith("tenant-b")
  })

  it("ignora un tenant recordado que ya no existe y usa el primero", async () => {
    window.localStorage.setItem("integration-dashboard:last-tenant", "tenant-borrado")

    render(<Dashboard tenants={tenants} />)

    expect(screen.getByRole("button", { name: /Aurora Retail/i })).toHaveAttribute("aria-current", "true")
    expect(await screen.findByText("Mercado Pago")).toBeInTheDocument()
  })

  it("guarda en localStorage el tenant que elige el usuario", async () => {
    const user = userEvent.setup()
    render(<Dashboard tenants={tenants} />)

    await user.click(screen.getByRole("button", { name: /Bravo Foods/i }))

    expect(window.localStorage.getItem("integration-dashboard:last-tenant")).toBe("tenant-b")
  })

  it("muestra un loading state mientras cambia de tenant, y lo saca al terminar", async () => {
    const user = userEvent.setup()
    render(<Dashboard tenants={tenants} />)
    await screen.findByText("Mercado Pago")

    let resolveSecond: (value: Integration[]) => void = () => {}
    jest.mocked(api.getIntegrations).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSecond = resolve
        }),
    )

    await user.click(screen.getByRole("button", { name: /Bravo Foods/i }))
    expect(screen.getByText("Cargando integraciones…")).toBeInTheDocument()

    resolveSecond([makeIntegration({ id: "tenant-b-int", tenantId: "tenant-b", name: "Stripe" })])

    expect(await screen.findByText("Stripe")).toBeInTheDocument()
    expect(screen.queryByText("Cargando integraciones…")).not.toBeInTheDocument()
  })

  it("selecciona una integración y actualiza el detalle al reintentar", async () => {
    const user = userEvent.setup()
    jest
      .mocked(api.getIntegrations)
      .mockImplementation(async (tenantId) => [
        makeIntegration({ id: `${tenantId}-int`, tenantId, status: "failed" }),
      ])
    jest.mocked(api.retryIntegration).mockImplementation(async (integration) => ({
      ...integration,
      status: "retrying",
      events: [
        { id: "e1", timestamp: "2026-01-02T00:00:00.000Z", status: "retrying", message: "reintentando" },
        ...integration.events,
      ],
    }))

    render(<Dashboard tenants={tenants} />)
    await user.click(await screen.findByRole("button", { name: /Mercado Pago/i }))
    expect(screen.getByRole("heading", { name: "Mercado Pago", level: 2 })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Reintentar" }))

    expect(await screen.findByText("reintentando")).toBeInTheDocument()
  })

  it("no arrastra un reintento en curso a otra integración del mismo tenant", async () => {
    const user = userEvent.setup()
    const mercadoPago = makeIntegration({ id: "int-mp", name: "Mercado Pago", status: "failed" })
    const andreani = makeIntegration({ id: "int-andreani", name: "Andreani", status: "failed" })
    jest.mocked(api.getIntegrations).mockResolvedValue([mercadoPago, andreani])
    let resolveRetry: (value: Integration) => void = () => {}
    jest.mocked(api.retryIntegration).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRetry = resolve
        }),
    )

    render(<Dashboard tenants={tenants} />)
    await user.click(await screen.findByRole("button", { name: /Mercado Pago/i }))
    await user.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(screen.getByRole("button", { name: "Reintentando…" })).toBeDisabled()

    await user.click(screen.getByRole("button", { name: /Andreani/i }))
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled()

    await act(async () => {
      resolveRetry({ ...mercadoPago, status: "up_to_date" })
    })
  })

  it("no dispara un warning de React si se desmonta antes de que resuelva el fetch de integraciones", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {})
    let resolveIntegrations: (value: Integration[]) => void = () => {}
    jest.mocked(api.getIntegrations).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveIntegrations = resolve
      }),
    )

    const { unmount } = render(<Dashboard tenants={tenants} />)
    unmount()

    await act(async () => {
      resolveIntegrations([makeIntegration()])
    })

    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it("si localStorage tira una excepción al leer, sigue funcionando con el primer tenant", async () => {
    const getItemSpy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("localStorage no disponible (modo privado)")
    })

    render(<Dashboard tenants={tenants} />)

    expect(await screen.findByRole("button", { name: /Aurora Retail/i })).toHaveAttribute(
      "aria-current",
      "true",
    )

    getItemSpy.mockRestore()
  })
})
