"use client"

import type { Tenant } from "~/lib/types"

interface TenantSelectorProps {
  tenants: Tenant[]
  selectedTenantId: string
  onSelect: (tenantId: string) => void
}

/**
 * Selector de cliente/tenant. Existe a propósito: el dashboard no asume
 * "un cliente fijo" como haría un fork por cliente, sino que la misma
 * plataforma sirve a varios tenants seleccionando entre ellos.
 *
 * Son botones simples con `aria-current`, no `role="tab"`. El patrón ARIA de
 * tabs exige navegación con flechas y un solo tab-stop (roving tabindex); acá
 * no hay tabpanels que mostrar/ocultar, así que ese contrato no aplicaba, y
 * declarar el rol sin implementarlo completo es peor que no declararlo.
 */
export function TenantSelector({ tenants, selectedTenantId, onSelect }: TenantSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Seleccionar cliente">
      {tenants.map((tenant) => {
        const isSelected = tenant.id === selectedTenantId
        return (
          <button
            key={tenant.id}
            type="button"
            aria-current={isSelected ? "true" : undefined}
            onClick={() => onSelect(tenant.id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              isSelected
                ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                : "border-neutral-300 text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300"
            }`}
          >
            {tenant.name}
            <span className="ml-1.5 text-xs opacity-60">({tenant.platform})</span>
          </button>
        )
      })}
    </div>
  )
}
