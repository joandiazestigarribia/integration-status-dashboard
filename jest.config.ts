import type { Config } from "jest"
import nextJest from "next/jest.js"

const createJestConfig = nextJest({ dir: "./" })

const config: Config = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/src/$1",
  },
  // Sin esto, `--coverage` solo mide los archivos que los tests importan, no
  // todo `src`. Un archivo que ningún test toca no aparece 0% cubierto: no
  // aparece directamente, y el número final termina siendo más alto de lo
  // real (y distinto de lo que SonarCloud ve, que sí cruza sonar.sources
  // contra el lcov entero).
  //
  // Quedan afuera solo los archivos sin lógica propia para testear: el shell
  // de Next (layout/page) y el registro del service worker, que es un
  // chequeo de soporte del navegador envuelto en try/catch silencioso.
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/app/layout.tsx",
    "!src/app/page.tsx",
    "!src/components/ServiceWorkerRegister.tsx",
  ],
}

export default createJestConfig(config)
