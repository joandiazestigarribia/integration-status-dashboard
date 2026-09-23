import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ErrorBoundary from "~/app/error"

describe("error boundary", () => {
  it("muestra el mensaje y llama a reset al reintentar", async () => {
    const user = userEvent.setup()
    const reset = jest.fn()

    render(<ErrorBoundary error={new Error("boom")} reset={reset} />)

    expect(screen.getByRole("heading", { name: "Algo salió mal" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(reset).toHaveBeenCalledTimes(1)
  })
})
