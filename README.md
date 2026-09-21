# Panel de sincronización (multi-cliente)

![CI](https://github.com/joandiazestigarribia/integration-status-dashboard/actions/workflows/ci.yml/badge.svg)

Dashboard que muestra el estado de integraciones de **pagos, logística, ERP y
marketplaces** por cliente (tenant), con reintentos, línea de tiempo de
eventos, instalable como PWA y con soporte sin conexión.

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
- PWA: manifest + service worker propio con soporte offline (sin librerías de por medio)
- CI: GitHub Actions (lint, typecheck, tests, SonarCloud, Trivy)

## Cómo correrlo

El CI y el Dockerfile usan Node 24 (LTS). Localmente alcanza con Node 20.9 o
superior (el mínimo de Next.js 16); en Node 20, `npm install` muestra un
warning de `engines` de `@testing-library/jest-dom` (pide Node 22+) que no
afecta al funcionamiento.

```bash
npm install
npm run dev       # http://localhost:3000
```

Para probar el modo sin conexión hay que usar el build de producción (en
`npm run dev` el service worker se desregistra a propósito):

```bash
npm run build && npm start   # http://localhost:3000
```

Después, en DevTools: Application, Service Workers (debe figurar activo),
Network en "Offline" y recargar. Lighthouse también audita la PWA.

Otros scripts:

```bash
npm run build       # build de producción (genera .next/standalone)
npm run start       # copia public/ y los assets estáticos a .next/standalone y lo levanta: el mismo artefacto que corre en Docker
npm run lint         # ESLint
npm run typecheck    # genera los tipos de rutas de Next (next typegen) + tsc --noEmit
npm run test         # Jest
npm run test:coverage # Jest con cobertura de todo src (la que lee SonarCloud)
npm run format       # Prettier (con el plugin de Tailwind)
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
      normalize.ts        → adapters que las convierten al modelo común
    mock-data.ts          → datos de ejemplo por tenant
    api.ts                 → capa de acceso a datos (simula latencia y reintentos)
```

## Decisiones de arquitectura

- **Adapter pattern en `lib/adapters`**, no en los componentes. Cada
  integración real (una pasarela de pagos, un carrier, un ERP) devuelve datos
  con su propia forma; normalizarlos en un solo lugar es lo que evita que esa
  diferencia se filtre a la UI. Hoy hay cuatro (pagos, logística, ERP y
  marketplace, cada una con una forma cruda distinta): sumar otra es escribir
  su adapter y su forma cruda, sin tocar la lógica del dashboard. El
  marketplace se agregó exactamente así, y TypeScript obliga a darle una
  etiqueta en la UI porque el mapa de tipos es exhaustivo.
- **Los tenants se cargan en el servidor y las integraciones en el cliente.**
  `app/page.tsx` es un Server Component que pide la lista de tenants (estable)
  y se la pasa a `Dashboard` por props, así el cliente no espera un fetch
  previo para poder pedir las integraciones (antes eran dos en serie). Las
  integraciones no se renderizan en el servidor a propósito: son el dato
  volátil, y prerenderizarlas congelaría sus timestamps en el momento del
  build y desalinearía las fechas entre la zona horaria del servidor y la del
  navegador (hydration mismatch). Con una API real, el paso siguiente sería
  pedirlas en el servidor con `revalidate` y un `Suspense` para hacer
  streaming del resto de la página.
- **Modo offline con una estrategia por tipo de recurso** (`public/sw.js`). El
  HTML y el manifest van con red primero, para no servir nunca una build
  vieja estando online, y caen al caché solo sin conexión. Los archivos de
  `/_next/static` llevan hash en el nombre y nunca cambian, así que van con
  caché primero, con un tope de entradas que descarta primero los de builds
  viejas (sin tope crecerían sin límite entre deploys). Al instalarse, el
  service worker baja los assets que lista el HTML, porque la primera visita
  los pide antes de que él controle la página. En desarrollo se desregistra:
  con chunks que cambian en cada edición, un caché primero dejaría el código
  viejo.
- **Loading state derivado, no seteado a mano.** `Dashboard.tsx` no hace
  `setIsLoading(true)` al arrancar un efecto (dispara renders en cascada
  innecesarios); en cambio compara el tenant seleccionado contra el tenant al
  que pertenecen los datos cargados.
- **`localStorage` solo para una conveniencia de UI** (recordar el último
  cliente visto), nunca para estado que importe de verdad; por eso está
  envuelto en `try/catch` y no rompe nada si falla.
- **El selector de tenant usa botones con `aria-current`, no `role="tab"`.**
  El patrón ARIA de tabs exige navegación con flechas y un solo tab-stop
  (roving tabindex); acá no hay tabpanels que mostrar/ocultar, así que ese
  contrato no aplicaba. Declarar el rol sin implementarlo completo es peor
  que no declararlo: un lector de pantalla anuncia un comportamiento que
  después no está.

## Qué NO hice, y por qué

Ninguna de estas es una omisión accidental: cada una quedó afuera para no
pasarme del alcance de un proyecto pequeño.

- **Sin backend ni base de datos real.** Los datos viven en memoria
  (`lib/mock-data.ts`) y la "API" (`lib/api.ts`) solo simula latencia de red.
  Un backend real sería otro proyecto entero.
- **Sin colas ni workers reales.** El botón "Reintentar" simula una
  sincronización con una promesa que resuelve en ~700ms; no hay RabbitMQ ni
  nada parecido detrás. La arquitectura (adapter + estado por evento) es la
  misma que necesitaría una integración real; el transporte no lo es.
- **Sin persistencia del último estado conocido.** El panel funciona sin
  conexión porque los datos son un mock que viaja dentro del bundle, no
  porque se guarden respuestas. Con una API real habría que cachear esas
  respuestas (stale-while-revalidate en el service worker, o una copia local
  por tenant) y mostrar de cuándo son; el punto de cambio es `lib/api.ts`.
  Simularlo hoy sería inventar un camino de código que nada ejercita.
- **Sin autenticación.** No hay usuarios ni permisos: el selector de tenant
  es solo de front, no hay multi-tenancy real de datos ni de acceso.
- **Sin microservicios.** Todo vive en una sola app Next.js. Separar esto en
  servicios sería sobre-ingeniería para lo que este proyecto necesita
  demostrar.
- **Sin manejo de error de red real en el reintento.** `retryIntegration`
  está mockeada para resolver siempre (varía el resultado de negocio, nunca
  la promesa), así que no hay hoy una falla de conexión real que probar. El
  código igual no asume que nunca va a pasar: `IntegrationDetail` atrapa un
  eventual rechazo y muestra un error en vez de perderlo en silencio, pero
  no hay un caso mockeado que lo dispare.
- **SonarCloud está en el pipeline pero requiere configuración propia** (un
  `SONAR_TOKEN` y una organización de SonarCloud): el workflow saltea ese
  paso si no hay token, en vez de romper el CI de quien clone el repo. Trivy
  no necesita configuración y corre siempre.
