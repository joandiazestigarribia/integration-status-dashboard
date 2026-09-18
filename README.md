# Panel de sincronización (multi-cliente)

Dashboard que muestra el estado de integraciones de **pagos, logística y ERP**
por cliente (tenant), con reintentos, línea de tiempo de eventos, e
instalable como PWA.

Es un proyecto de portfolio pensado para una entrevista como Frontend
Developer: el objetivo no es la cantidad de funcionalidades, sino mostrar
criterio de arquitectura, testing y CI/CD dentro de un alcance chico y
terminado.

## Por qué este proyecto

- Es, en miniatura, el mismo tipo de problema que resuelven las empresas que
  venden integraciones como producto: sincronizar catálogo, stock, pagos o
  pedidos entre plataformas distintas, para más de un cliente a la vez.
- Es **multi-tenant a propósito** (selector de cliente arriba de todo, no un
  cliente fijo): la arquitectura demuestra por sí sola la diferencia entre
  "una integración por cliente" y "una plataforma unificada que sirve a
  todos los clientes con el mismo código".
- Cada integración mockeada imita una forma de datos distinta (ver
  `src/lib/adapters/raw-types.ts`) a propósito, para justificar una capa de
  **adapters** que las normaliza a un solo modelo (`src/lib/types.ts`) antes
  de que le lleguen a cualquier componente.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Framer Motion (transiciones de estado)
- Jest + React Testing Library
- PWA: manifest + service worker propio (sin librerías de por medio)
- CI: GitHub Actions (lint, typecheck, tests, SonarCloud, Trivy)

## Cómo correrlo

Requiere Node 24 (LTS), la misma versión que usan el CI y el Dockerfile.

```bash
npm install
npm run dev       # http://localhost:3000
```

Otros scripts:

```bash
npm run build          # build de producción
npm run lint            # ESLint
npm run typecheck       # genera los tipos de rutas de Next (next typegen) + tsc --noEmit
npm run test             # Jest
npm run test:coverage    # Jest con cobertura (la que lee SonarCloud)
npm run format            # Prettier (con el plugin de Tailwind)
```

## Estructura

```
src/
  app/                  → App Router (layout, page)
  components/           → UI (todas las piezas que arma el dashboard)
  lib/
    types.ts            → modelo de dominio normalizado
    adapters/
      raw-types.ts       → formas "crudas" simuladas, una por integración
      normalize.ts        → adapters + factory que las convierte al modelo común
    mock-data.ts          → datos de ejemplo por tenant
    api.ts                 → capa de acceso a datos (simula latencia y reintentos)
```

## Decisiones de arquitectura

- **Adapter pattern en `lib/adapters`**, no en los componentes. Cada
  integración real (una pasarela de pagos, un carrier, un ERP) devuelve datos
  con su propia forma; normalizarlos en un solo lugar es lo que evita que esa
  diferencia se filtre a la UI. Agregar una cuarta integración es agregar un
  adapter, no tocar el dashboard.
- **Loading state derivado, no seteado a mano.** `Dashboard.tsx` no hace
  `setIsLoading(true)` al arrancar un efecto (dispara renders en cascada
  innecesarios); en cambio compara el tenant seleccionado contra el tenant al
  que pertenecen los datos cargados.
- **`localStorage` solo para una conveniencia de UI** (recordar el último
  cliente visto), nunca para estado que importe de verdad; por eso está
  envuelto en `try/catch` y no rompe nada si falla.

## Qué NO hice, y por qué

Ninguna de estas es una omisión accidental: cada una quedó afuera para no
pasarme del alcance de un proyecto de portfolio de 1-2 fines de semana.

- **Sin backend ni base de datos real.** Los datos viven en memoria
  (`lib/mock-data.ts`) y la "API" (`lib/api.ts`) solo simula latencia de red.
  Un backend real sería otro proyecto entero.
- **Sin colas ni workers reales.** El botón "Reintentar" simula una
  sincronización con una promesa que resuelve en ~700ms; no hay RabbitMQ ni
  nada parecido detrás. La arquitectura (adapter + estado por evento) es la
  misma que necesitaría una integración real; el transporte no lo es.
- **Sin autenticación.** No hay usuarios ni permisos: el selector de tenant
  es solo de front, no hay multi-tenancy real de datos ni de acceso.
- **Sin microservicios.** Todo vive en una sola app Next.js. Separar esto en
  servicios sería sobre-ingeniería para lo que este proyecto necesita
  demostrar.
- **SonarCloud está en el pipeline pero requiere configuración propia** (un
  `SONAR_TOKEN` y una organización de SonarCloud): el workflow saltea ese
  paso si no hay token, en vez de romper el CI de quien clone el repo. Trivy
  no necesita configuración y corre siempre.
