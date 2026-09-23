import { NextResponse } from "next/server"
import { findTenant, listIntegrations } from "~/lib/server/data"

export async function GET(_request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params

  if (!findTenant(tenantId)) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
  }

  return NextResponse.json(listIntegrations(tenantId), {
    headers: {
      "x-fetched-at": new Date().toISOString(),
      "cache-control": "no-store",
    },
  })
}
