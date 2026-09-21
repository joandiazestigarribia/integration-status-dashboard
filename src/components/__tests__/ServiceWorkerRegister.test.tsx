import { render, waitFor } from "@testing-library/react"
import { ServiceWorkerRegister } from "~/components/ServiceWorkerRegister"

function stubServiceWorker() {
  const registration = { unregister: jest.fn() }
  const serviceWorker = {
    register: jest.fn().mockResolvedValue(registration),
    getRegistrations: jest.fn().mockResolvedValue([registration]),
  }
  Object.defineProperty(navigator, "serviceWorker", { value: serviceWorker, configurable: true })
  return { registration, serviceWorker }
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "serviceWorker")
  jest.restoreAllMocks()
})

describe("ServiceWorkerRegister", () => {
  it("no hace nada si el navegador no soporta service workers", () => {
    const { container } = render(<ServiceWorkerRegister />)

    expect(container).toBeEmptyDOMElement()
  })

  it("en producción registra /sw.js", () => {
    jest.replaceProperty(process.env, "NODE_ENV", "production")
    const { serviceWorker } = stubServiceWorker()

    render(<ServiceWorkerRegister />)

    expect(serviceWorker.register).toHaveBeenCalledWith("/sw.js")
    expect(serviceWorker.getRegistrations).not.toHaveBeenCalled()
  })

  it("en producción sigue andando si el registro falla", async () => {
    jest.replaceProperty(process.env, "NODE_ENV", "production")
    const { serviceWorker } = stubServiceWorker()
    serviceWorker.register.mockRejectedValue(new Error("sin soporte"))

    render(<ServiceWorkerRegister />)

    await waitFor(() => expect(serviceWorker.register).toHaveBeenCalledTimes(1))
  })

  it("en desarrollo desregistra los service workers existentes y no registra ninguno", async () => {
    const { registration, serviceWorker } = stubServiceWorker()

    render(<ServiceWorkerRegister />)

    await waitFor(() => expect(registration.unregister).toHaveBeenCalledTimes(1))
    expect(serviceWorker.register).not.toHaveBeenCalled()
  })
})
