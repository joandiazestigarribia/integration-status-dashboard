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
    jest.mocked(api.getTenants).mockResolvedValue(tenants)
    jest
      .mocked(api.getIntegrations)
      .mockImplementation(async (tenantId) => [makeIntegration({ id: `${tenantId}-int`, tenantId })])
  })

  it("selecciona el primer tenant por defecto y muestra sus integraciones", async () => {
    render(<Dashboard />)

    expect(await screen.findByRole("button", { name: /Aurora Retail/i })).toHaveAttribute(
      "aria-current",
      "true",
    )
    expect(await screen.findByText("Mercado Pago")).toBeInTheDocument()
  })

  it("recuerda el último tenant visto en localStorage", async () => {
    window.localStorage.setItem("integration-dashboard:last-tenant", "tenant-b")

    render(<Dashboard />)

    expect(await screen.findByRole("button", { name: /Bravo Foods/i })).toHaveAttribute(
      "aria-current",
      "true",
    )
  })

  it("muestra un loading state mientras cambia de tenant, y lo saca al terminar", async () => {
    const user = userEvent.setup()
    render(<Dashboard />)
    await screen.findByText("Mercado Pago")

    let resolveSecond: (value: Integration[]) => void = () => {}
    jest.mocked(api.getIntegrations).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSecond = resolve
        }),
    )

    await user.click(await screen.findByRole("button", { name: /Bravo Foods/i }))
    expect(screen.getByText("Cargando integraciones…")).toBeInTheDocument()

    resolveSecond([makeIntegration({ id: "tenant-b-int", tenantId: "tenant-b", name: "Stripe" })])

    expect(await screen.findByText("Stripe")).toBeInTheDocument()
    expect(screen.queryByText("Cargando integraciones…")).not.toBeInTheDocument()
  })

  it("selecciona una integración y actualiza el detalle al reintentar", async () => {
    const user = userEvent.setup()
    // "up_to_date" (el default de makeIntegration) deshabilita el botón de
    // reintentar; para poder clickearlo, la integración inicial tiene que
    // arrancar en un estado que sí lo permita.
    jest
      .mocked(api.getIntegrations)
      .mockImplementation(async (tenantId) => [
        makeIntegration({ id: `${tenantId}-int`, tenantId, status: "failed" }),
      ])
    // Preserva el id de la integración recibida, igual que la implementación
    // real (que parte de `{ ...integration, ... }`): así el `.map()` por id
    // que hace Dashboard la encuentra y la reemplaza.
    jest.mocked(api.retryIntegration).mockImplementation(async (integration) => ({
      ...integration,
      status: "retrying",
      events: [
        { id: "e1", timestamp: "2026-01-02T00:00:00.000Z", status: "retrying", message: "reintentando" },
        ...integration.events,
      ],
    }))

    render(<Dashboard />)
    await user.click(await screen.findByRole("button", { name: /Mercado Pago/i }))
    // level: 2 para el <h2> del detalle: la tarjeta de la lista también tiene
    // un heading "Mercado Pago" (su <h3>), y con el detalle abierto ambos
    // coexisten en el DOM.
    expect(screen.getByRole("heading", { name: "Mercado Pago", level: 2 })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Reintentar" }))

    expect(await screen.findByText("reintentando")).toBeInTheDocument()
  })

  it("no dispara un warning de React si se desmonta antes de que resuelva el fetch inicial", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {})
    let resolveTenants: (value: Tenant[]) => void = () => {}
    jest.mocked(api.getTenants).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveTenants = resolve
      }),
    )

    const { unmount } = render(<Dashboard />)
    unmount()

    await act(async () => {
      resolveTenants(tenants)
    })

    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it("si localStorage tira una excepción al leer, sigue funcionando con el primer tenant", async () => {
    const getItemSpy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("localStorage no disponible (modo privado)")
    })

    render(<Dashboard />)

    expect(await screen.findByRole("button", { name: /Aurora Retail/i })).toHaveAttribute(
      "aria-current",
      "true",
    )

    getItemSpy.mockRestore()
  })
})
