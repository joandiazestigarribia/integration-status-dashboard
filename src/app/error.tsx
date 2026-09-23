"use client"

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col items-start px-4 py-16 sm:px-6">
      <h1 className="text-lg font-semibold tracking-tight">Algo salió mal</h1>
      <p className="text-muted mt-2 max-w-prose text-sm">No pudimos cargar el panel. Probá de nuevo.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="bg-ink text-canvas mt-6 rounded-lg px-4 py-2 text-sm font-medium transition duration-150 hover:opacity-90 active:translate-y-px"
      >
        Reintentar
      </button>
    </div>
  )
}
