import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Genera .next/standalone: un server mínimo con solo las dependencias que usa
  // en runtime. Es lo que el Dockerfile copia a la imagen final.
  output: "standalone",
}

export default nextConfig
