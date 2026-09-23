import { render, screen } from "@testing-library/react"
import NotFound from "~/app/not-found"

describe("not found", () => {
  it("muestra el mensaje y el enlace de vuelta al panel", () => {
    render(<NotFound />)

    expect(screen.getByRole("heading", { name: "Página no encontrada" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Volver al panel" })).toHaveAttribute("href", "/")
  })
})
