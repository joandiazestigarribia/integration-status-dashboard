import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { TenantSelector } from "~/components/TenantSelector"
import type { Tenant } from "~/lib/types"

const tenants: Tenant[] = [
  { id: "tenant-a", name: "Aurora Retail", platform: "vtex" },
  { id: "tenant-b", name: "Bravo Foods", platform: "shopify" },
]

describe("TenantSelector", () => {
  it("marca como seleccionado el tenant activo", () => {
    render(<TenantSelector tenants={tenants} selectedTenantId="tenant-a" onSelect={() => {}} />)
    expect(screen.getByRole("button", { name: /Aurora Retail/i })).toHaveAttribute("aria-current", "true")
    expect(screen.getByRole("button", { name: /Bravo Foods/i })).not.toHaveAttribute("aria-current")
  })

  it("llama a onSelect con el id del tenant clickeado", async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    render(<TenantSelector tenants={tenants} selectedTenantId="tenant-a" onSelect={onSelect} />)

    await user.click(screen.getByRole("button", { name: /Bravo Foods/i }))

    expect(onSelect).toHaveBeenCalledWith("tenant-b")
  })
})
