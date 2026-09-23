import { fetchJson, fetchJsonResponse } from "~/lib/http"
import type { Integration } from "~/lib/types"

export interface IntegrationsPayload {
  integrations: Integration[]
  fetchedAt: string | null
}

const FETCHED_AT_HEADER = "x-fetched-at"

export async function getIntegrations(
  tenantId: string,
  options: { signal?: AbortSignal } = {},
): Promise<IntegrationsPayload> {
  const { data, response } = await fetchJsonResponse<Integration[]>(
    `/api/integrations/${encodeURIComponent(tenantId)}`,
    { signal: options.signal },
  )

  return { integrations: data, fetchedAt: response.headers.get(FETCHED_AT_HEADER) }
}

export async function retryIntegration(integration: Integration): Promise<Integration> {
  return fetchJson<Integration>(
    `/api/integrations/${encodeURIComponent(integration.tenantId)}/${encodeURIComponent(integration.id)}/retry`,
    { method: "POST", body: JSON.stringify(integration), retries: 0 },
  )
}
