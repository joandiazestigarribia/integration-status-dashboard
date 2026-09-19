import type { Integration, SyncEvent, SyncStatus } from "~/lib/types"
import type {
  RawErpIntegration,
  RawLogisticsIntegration,
  RawPaymentsIntegration,
} from "~/lib/adapters/raw-types"

export function normalizePaymentsIntegration(raw: RawPaymentsIntegration): Integration {
  return {
    id: raw.integration_id,
    tenantId: raw.tenant_id,
    name: raw.display_name,
    kind: "payments",
    status: mapPaymentsStatus(raw.gateway_status),
    lastSyncedAt: new Date(raw.last_sync_unix * 1000).toISOString(),
    recordsSynced: raw.synced_count,
    events: raw.log.map((entry, index) => ({
      id: `${raw.integration_id}-evt-${index}`,
      timestamp: new Date(entry.ts_unix * 1000).toISOString(),
      status: mapPaymentsStatus(entry.state),
      message: entry.detail,
    })),
  }
}

export function normalizeLogisticsIntegration(raw: RawLogisticsIntegration): Integration {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    name: raw.carrierName,
    kind: "logistics",
    status: mapLogisticsStatus(raw.connectionHealth),
    lastSyncedAt: raw.lastUpdate,
    recordsSynced: raw.shipmentsProcessed,
    events: raw.history.map((entry, index) => ({
      id: `${raw.id}-evt-${index}`,
      timestamp: entry.at,
      status: mapLogisticsStatus(entry.health),
      message: entry.note,
    })),
  }
}

export function normalizeErpIntegration(raw: RawErpIntegration): Integration {
  return {
    id: raw.code,
    tenantId: raw.tenant,
    name: raw.label,
    kind: "erp",
    status: mapErpStatus(raw.meta.healthy, raw.meta.hasPendingRetries),
    lastSyncedAt: raw.meta.lastRun,
    recordsSynced: raw.meta.rowsAffected,
    events: raw.runs.map((run, index) => ({
      id: `${raw.code}-evt-${index}`,
      timestamp: run.when,
      status: mapErpStatus(run.healthy, run.hasPendingRetries),
      message: run.summary,
    })),
  }
}

function mapPaymentsStatus(state: "ok" | "degraded" | "down"): SyncStatus {
  if (state === "ok") return "up_to_date"
  if (state === "degraded") return "retrying"
  return "failed"
}

function mapLogisticsStatus(health: "connected" | "reconnecting" | "disconnected"): SyncStatus {
  if (health === "connected") return "up_to_date"
  if (health === "reconnecting") return "retrying"
  return "failed"
}

function mapErpStatus(healthy: boolean, hasPendingRetries: boolean): SyncStatus {
  if (healthy) return "up_to_date"
  if (hasPendingRetries) return "retrying"
  return "failed"
}

export function sortEventsDesc(events: SyncEvent[]): SyncEvent[] {
  return [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}
