import { NextResponse } from "next/server"
import { applyRetry, findTenant, hasIntegration } from "~/lib/server/data"
import type { Integration } from "~/lib/types"

const SYNC_DELAY_MS = 700

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isIntegration(value: unknown, tenantId: string, integrationId: string): value is Integration {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Partial<Integration>
  return (
    candidate.id === integrationId &&
    candidate.tenantId === tenantId &&
    typeof candidate.name === "string" &&
    typeof candidate.lastSyncedAt === "string" &&
    typeof candidate.recordsSynced === "number" &&
    Array.isArray(candidate.events)
  )
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; integrationId: string }> },
) {
  const { tenantId, integrationId } = await params

  if (!findTenant(tenantId)) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
  }
  if (!hasIntegration(tenantId, integrationId)) {
    return NextResponse.json({ error: "Integración no encontrada" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = null
  }

  // Sin persistencia en el servidor, el cliente manda el estado que conoce.
  if (!isIntegration(body, tenantId, integrationId)) {
    return NextResponse.json({ error: "Cuerpo de la petición inválido" }, { status: 400 })
  }

  await sleep(SYNC_DELAY_MS)

  return NextResponse.json(applyRetry(body), { headers: { "cache-control": "no-store" } })
}
