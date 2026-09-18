import { cpSync, existsSync } from "node:fs"

// El build "standalone" (next.config.ts) no incluye `public/` ni los assets
// estáticos: el Dockerfile los copia a mano antes de levantar el server. Este
// script hace lo mismo para poder correr localmente, con `npm start`, el
// mismo artefacto que corre en producción (antes, `npm start` usaba
// `next start`, que Next 16 marca como incompatible con output: standalone).
if (!existsSync(".next/standalone")) {
  console.error("No existe .next/standalone. Corré `npm run build` primero.")
  process.exit(1)
}

cpSync("public", ".next/standalone/public", { recursive: true })
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true })
