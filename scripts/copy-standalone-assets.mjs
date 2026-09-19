import { cpSync, existsSync } from "node:fs"

if (!existsSync(".next/standalone")) {
  console.error("No existe .next/standalone. Corré `npm run build` primero.")
  process.exit(1)
}

cpSync("public", ".next/standalone/public", { recursive: true })
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true })
