"use client"

import type { Tenant } from "~/lib/types"

interface TenantSelectorProps {
  tenants: Tenant[]
  selectedTenantId: string
  onSelect: (tenantId: string) => void
}

export function TenantSelector({ tenants, selectedTenantId, onSelect }: TenantSelectorProps) {
  return (
    <div className="border-line border-b">
      <div role="group" aria-label="Seleccionar cliente" className="-mb-px flex flex-wrap gap-x-6 gap-y-3">
        {tenants.map((tenant) => {
          const isSelected = tenant.id === selectedTenantId
          return (
            <button
              key={tenant.id}
              type="button"
              aria-current={isSelected ? "true" : undefined}
              onClick={() => onSelect(tenant.id)}
              className={`border-b-2 pb-3 text-sm font-medium whitespace-nowrap transition-colors ${
                isSelected ? "border-ink text-ink" : "text-muted hover:text-ink border-transparent"
              }`}
            >
              {tenant.name}
              <span className="text-muted ml-1.5 text-xs font-normal">({tenant.platform})</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
