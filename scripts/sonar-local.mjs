import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"

const token = process.env.SONAR_TOKEN
if (!token) {
  console.error("Falta SONAR_TOKEN en el entorno. Exportalo antes de correr el análisis local.")
  process.exit(1)
}

if (!existsSync("coverage/lcov.info")) {
  console.error("Falta coverage/lcov.info. Corré `npm run test:coverage` primero.")
  process.exit(1)
}

// Usa el mismo scanner que el CI (vía Docker, para no depender de Java local).
// `sonar-project.properties` tiene qualitygate.wait=true, así que sale con
// código distinto de cero si el quality gate falla.
const args = [
  "run",
  "--rm",
  "-v",
  `${process.cwd()}:/usr/src`,
  "-e",
  `SONAR_TOKEN=${token}`,
  "sonarsource/sonar-scanner-cli",
  "-Dsonar.host.url=https://sonarcloud.io",
]

try {
  execFileSync("docker", args, { stdio: "inherit" })
} catch (error) {
  if (error.code === "ENOENT") {
    console.error("No se encontró `docker`. Instalá Docker o dejá que el análisis corra en CI.")
    process.exit(1)
  }
  process.exit(typeof error.status === "number" ? error.status : 1)
}
