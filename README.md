# Panel de sincronización (multi-cliente)

![CI](https://github.com/joandiazestigarribia/integration-status-dashboard/actions/workflows/ci.yml/badge.svg)

Panel para seguir el estado de las integraciones de pagos, logística, ERP y
marketplaces de cada cliente: última corrida, reintentos, historial de eventos
y modo offline.

## Stack

Next.js (App Router) con TypeScript, Tailwind y Framer Motion. Tests con Jest y
React Testing Library. La PWA (manifest y service worker) es propia, sin
librerías de por medio.

Los datos los sirve una API hecha con route handlers de Next y el cliente la
consume por HTTP. El CI corre en GitHub Actions: lint, typecheck, tests,
SonarCloud y Trivy.

## Cómo correrlo

Necesitás Node 20.9 o superior (el CI usa 24).

```bash
npm install
npm run dev        # http://localhost:3000
```

El modo offline sólo funciona en el build de producción, porque en desarrollo
el service worker se desregistra (los chunks cambian en cada edición y un caché
primero terminaría sirviendo código viejo):

```bash
npm run build && npm start
```

Para probarlo: DevTools → Application → Service Workers (debe quedar activo),
Network en "Offline" y recargar.

## Scripts

```bash
npm run check         # format:check + lint + typecheck + test:coverage (lo mismo que el CI)
npm run test          # tests
npm run test:coverage # tests + cobertura
npm run lint
npm run typecheck
npm run format        # Prettier
npm run build         # build de producción
npm run start         # levanta el standalone (el artefacto que usa Docker)
npm run sonar:local   # análisis de SonarCloud local (Docker + SONAR_TOKEN)
```

Un hook de `pre-commit` corre `npm run check` antes de cada commit. Se instala
solo con `npm install` y se saltea con `git commit --no-verify`.

## Estructura

```
src/
  app/          rutas, límites de error y route handlers de la API
  components/   UI del dashboard
  lib/          dominio, adapters y transporte HTTP
  lib/server/   lo que sólo corre en el servidor
```

## Algunas decisiones

- **Adapters.** Cada integración devuelve datos con su propia forma
  (`lib/adapters/raw-types.ts`); los adapters la normalizan a un modelo único
  (`lib/types.ts`) antes de que toque cualquier componente. Sumar una
  integración nueva es escribir su adapter, sin tocar la UI.
- **Tenants en el servidor, integraciones por HTTP.** `app/page.tsx` lee la
  lista de clientes (que cambia poco) y se la pasa a `Dashboard`. Las
  integraciones, que sí cambian, el cliente las pide por HTTP. Si se
  renderizaran en el servidor, sus timestamps quedarían fijados en el build y
  las fechas podrían no coincidir con las del navegador.
- **Offline por tipo de recurso.** El HTML va con red primero, para no servir
  una build vieja. Las respuestas de `/api` también, pero cacheadas por URL:
  como la URL incluye el cliente, cada uno guarda su último estado conocido y
  el panel sigue mostrando datos sin conexión. Los assets de `/_next/static`
  van con caché primero, porque llevan hash y no cambian.
- **El reintento es un `POST` a un route handler, no un Server Action.** Next
  recomienda Server Actions para mutaciones, pero acá interesaba mostrar el
  consumo de una API REST, y el service worker necesita una URL real para
  cachear el `GET`.
- **Estado de carga derivado.** Se calcula comparando el cliente seleccionado
  con el de los datos ya cargados, en lugar de prender y apagar un `isLoading`
  desde un efecto.

## Qué quedó afuera

Los datos viven en memoria: no hay base de datos ni estado compartido entre
instancias. Tampoco colas ni workers reales (el reintento simula ~700 ms),
autenticación, paginado ni microservicios. Todo eso quedó afuera por alcance:
la idea era mostrar la arquitectura de front, no montar un backend.

SonarCloud necesita un `SONAR_TOKEN` y una organización propios, así que el
workflow saltea ese paso si no están configurados. Trivy corre siempre.
