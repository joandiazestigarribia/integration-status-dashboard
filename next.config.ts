import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Genera .next/standalone: un server mínimo con solo las dependencias que usa
  // en runtime. Es lo que el Dockerfile copia a la imagen final.
  output: "standalone",
  // Next genera archivos de reglas para agentes en la raíz al arrancar
  // `next dev`. No queremos esos archivos en el repo.
  agentRules: false,
}

export default nextConfig
