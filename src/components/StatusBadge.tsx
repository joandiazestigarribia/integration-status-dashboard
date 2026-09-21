"use client"

import { motion, AnimatePresence } from "framer-motion"
import type { SyncStatus } from "~/lib/types"

export const STATUS_STYLES: Record<SyncStatus, { label: string; dot: string; text: string }> = {
  up_to_date: { label: "Al día", dot: "bg-ok", text: "text-ok" },
  retrying: { label: "Con reintentos", dot: "bg-warn", text: "text-warn" },
  failed: { label: "Con error", dot: "bg-fail", text: "text-fail" },
}

export function StatusBadge({ status }: { status: SyncStatus }) {
  const style = STATUS_STYLES[status]

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap ${style.text}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={status}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={`h-2 w-2 rounded-full ${style.dot}`}
          aria-hidden
        />
      </AnimatePresence>
      {style.label}
    </span>
  )
}
