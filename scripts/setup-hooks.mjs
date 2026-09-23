import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"

// Apunta los hooks de git al directorio versionado .githooks (pre-push).
// No rompe si no es un repo git (por ejemplo, en el build de Docker, donde
// .git se excluye con .dockerignore).
if (!existsSync(".git")) process.exit(0)

try {
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], { stdio: "ignore" })
} catch {
  // git no disponible: no bloquea la instalación
}
