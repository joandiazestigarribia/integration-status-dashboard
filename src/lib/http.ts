export class ApiError extends Error {
  readonly status: number | null

  constructor(message: string, status: number | null) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

const DEFAULT_RETRIES = 2
const BASE_BACKOFF_MS = 300

export interface FetchJsonOptions {
  signal?: AbortSignal
  method?: string
  body?: string
  retries?: number
}

function isRetryableStatus(status: number | null): boolean {
  return status !== null && (status === 429 || status >= 500)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchJsonResponse<T>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<{ data: T; response: Response }> {
  const { signal, retries = DEFAULT_RETRIES, method = "GET", body } = options
  let attempt = 0

  for (;;) {
    try {
      const response = await fetch(url, {
        method,
        body,
        signal,
        headers: {
          accept: "application/json",
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
      })

      if (!response.ok) {
        throw new ApiError(`La API respondió ${response.status}`, response.status)
      }

      const data = (await response.json()) as T
      return { data, response }
    } catch (error) {
      const aborted = signal?.aborted === true
      const retryable =
        error instanceof ApiError ? isRetryableStatus(error.status) : error instanceof TypeError

      if (!aborted && retryable && attempt < retries) {
        await sleep(BASE_BACKOFF_MS * 2 ** attempt)
        attempt += 1
        continue
      }

      if (error instanceof ApiError) throw error
      throw new ApiError(aborted ? "La petición se canceló" : "No se pudo conectar con la API", null)
    }
  }
}

export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const { data } = await fetchJsonResponse<T>(url, options)
  return data
}
