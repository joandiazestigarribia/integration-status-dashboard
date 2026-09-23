import Link from "next/link"

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col items-start px-4 py-16 sm:px-6">
      <h1 className="text-lg font-semibold tracking-tight">Página no encontrada</h1>
      <p className="text-muted mt-2 max-w-prose text-sm">La dirección que abriste no existe.</p>
      <Link href="/" className="text-accent mt-6 text-sm font-medium underline-offset-4 hover:underline">
        Volver al panel
      </Link>
    </div>
  )
}
