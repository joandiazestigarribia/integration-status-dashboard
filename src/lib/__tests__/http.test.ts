import { ApiError, fetchJson, fetchJsonResponse } from "~/lib/http"

const fetchMock = jest.fn()

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
  } as unknown as Response
}

beforeEach(() => {
  fetchMock.mockReset()
  global.fetch = fetchMock as unknown as typeof fetch
})

afterEach(() => {
  jest.useRealTimers()
})

describe("fetchJsonResponse", () => {
  it("devuelve el JSON parseado y la respuesta cuando el pedido sale bien", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))

    const { data, response } = await fetchJsonResponse<{ ok: boolean }>("/api/x")

    expect(data).toEqual({ ok: true })
    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("mapea un 404 a un ApiError con su status y no lo reintenta", async () => {
    fetchMock.mockResolvedValue(jsonResponse("nope", 404))

    await expect(fetchJson("/api/x")).rejects.toMatchObject({ name: "ApiError", status: 404 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("reintenta un 500 con backoff y devuelve la respuesta cuando se recupera", async () => {
    jest.useFakeTimers()
    fetchMock
      .mockResolvedValueOnce(jsonResponse("boom", 500))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))

    const promise = fetchJson<{ ok: boolean }>("/api/x")
    const assertion = expect(promise).resolves.toEqual({ ok: true })

    await jest.advanceTimersByTimeAsync(300)
    await assertion

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("reintenta fallos de red y termina lanzando ApiError sin status tras agotar los intentos", async () => {
    jest.useFakeTimers()
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))

    const promise = fetchJson("/api/x")
    const assertion = expect(promise).rejects.toBeInstanceOf(ApiError)

    await jest.advanceTimersByTimeAsync(300)
    await jest.advanceTimersByTimeAsync(600)
    await assertion

    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("no reintenta cuando se pide retries: 0", async () => {
    fetchMock.mockResolvedValue(jsonResponse("boom", 503))

    await expect(fetchJson("/api/x", { retries: 0 })).rejects.toMatchObject({ status: 503 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("corta si la señal ya está abortada", async () => {
    const controller = new AbortController()
    controller.abort()
    fetchMock.mockRejectedValue(new DOMException("Aborted", "AbortError"))

    await expect(fetchJson("/api/x", { signal: controller.signal })).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("envía content-type sólo cuando hay body", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

    await fetchJson("/api/x", { method: "POST", body: JSON.stringify({ a: 1 }) })

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/x",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ a: 1 }),
        headers: expect.objectContaining({ "content-type": "application/json" }),
      }),
    )
  })
})
