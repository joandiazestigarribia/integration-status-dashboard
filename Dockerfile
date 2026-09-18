# Imagen mínima, solo para poder correr un scan de Trivy sobre un artefacto
# real en CI. El deploy pensado para este proyecto es Vercel, no este
# Dockerfile.

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# La imagen final lleva solo lo que corre en producción: el server standalone
# de Next (con las dependencias que usa en runtime, sin devDependencies) y los
# assets. Así Trivy escanea lo que se ejecutaría, no las herramientas de build.
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# La imagen oficial puede ir atrasada con los parches de seguridad de Alpine
# (p. ej. OpenSSL), así que los paquetes del sistema se actualizan al buildear.
# npm, corepack y yarn vienen en la imagen base pero el runtime no los usa.
RUN apk upgrade --no-cache \
  && rm -rf /usr/local/lib/node_modules /opt/yarn-* \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg
COPY --from=build /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
