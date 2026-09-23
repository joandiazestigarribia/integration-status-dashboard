# Imagen solo para el scan de Trivy en CI; el deploy es en Vercel.

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: evita que corra `prepare` (setup-hooks) antes de copiar scripts/.
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# apk upgrade: la imagen oficial puede ir atrasada con parches de Alpine (p. ej. OpenSSL).
# npm, corepack y yarn vienen en la imagen base pero el runtime no los usa.
RUN apk upgrade --no-cache \
  && rm -rf /usr/local/lib/node_modules /opt/yarn-* \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg
COPY --from=build /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
EXPOSE 3000
CMD ["node", "server.js"]
