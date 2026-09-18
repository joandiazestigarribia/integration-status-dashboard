import { render, screen } from "@testing-library/react"
import { StatusBadge } from "~/components/StatusBadge"

describe("StatusBadge", () => {
  it("muestra 'Al día' para up_to_date", () => {
    render(<StatusBadge status="up_to_date" />)
    expect(screen.getByText("Al día")).toBeInTheDocument()
  })

  it("muestra 'Con reintentos' para retrying", () => {
    render(<StatusBadge status="retrying" />)
    expect(screen.getByText("Con reintentos")).toBeInTheDocument()
  })

  it("muestra 'Con error' para failed", () => {
    render(<StatusBadge status="failed" />)
    expect(screen.getByText("Con error")).toBeInTheDocument()
  })
})
