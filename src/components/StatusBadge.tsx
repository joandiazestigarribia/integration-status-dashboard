"use client"

import { motion, AnimatePresence } from "framer-motion"
import type { SyncStatus } from "~/lib/types"

const STYLES: Record<SyncStatus, { label: string; dot: string; text: string }> = {
  up_to_date: { label: "Al día", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
  retrying: { label: "Con reintentos", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
  failed: { label: "Con error", dot: "bg-red-500", text: "text-red-700 dark:text-red-400" },
}

export function StatusBadge({ status }: { status: SyncStatus }) {
  const style = STYLES[status]

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${style.text}`}>
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
