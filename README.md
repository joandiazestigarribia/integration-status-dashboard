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
- API propia con route handlers de Next: el cliente consume los datos por HTTP, no por imports
- Tailwind CSS
- Framer Motion (transiciones de estado)
- Jest + React Testing Library
- PWA: manifest + service worker propio con soporte offline real por cliente (sin librerías de por medio)
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
npm run format:check # Prettier sin escribir (lo que corre el CI)
npm run check        # los mismos checks del CI: format:check + lint + typecheck + test:coverage
npm run sonar:local  # análisis de SonarCloud local (requiere Docker y SONAR_TOKEN)
```

### Verificar antes de pushear

Hay un hook de `pre-push` versionado en `.githooks/` que corre `npm run check`
automáticamente antes de cada push (y el análisis de SonarCloud si `SONAR_TOKEN`
está en el entorno). Se registra solo con `npm install` (o `npm run prepare`) y
se saltea con `git push --no-verify`.

`npm run check` corre exactamente lo que valida el job `quality` del CI (menos
SonarCloud). Para SonarCloud, el mismo scanner que usa el CI se puede correr
local y espera el quality gate (`sonar.qualitygate.wait=true`), así que sale con
código distinto de cero si va a fallar:

```bash
export SONAR_TOKEN=...   # el mismo token que el secret de GitHub
npm run test:coverage    # genera coverage/lcov.info
npm run sonar:local
```

Trivy, en cambio, sólo corre en el job `container-scan` sobre la imagen Docker:

```bash
docker build -t integration-status-dashboard:local .
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy \
  image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 integration-status-dashboard:local
```

## Estructura

```
src/
  app/
    api/                  → route handlers: la API REST que consume el cliente
    error.tsx             → límite de error del segmento raíz
    not-found.tsx         → 404 propio
    layout.tsx, page.tsx  → App Router (el page lee los tenants en el servidor)
  components/            → UI (todas las piezas que arma el dashboard)
  lib/
    types.ts             → modelo de dominio normalizado
    adapters/
      raw-types.ts        → formas "crudas" simuladas, una por integración
      normalize.ts         → adapters que las convierten al modelo común
    server/data.ts        → el "backend": lee los mocks y los normaliza (sólo servidor)
    http.ts               → transporte: ApiError, reintentos con backoff, cancelación
    api.ts                → cliente REST que usa el dashboard (fetch a /api)
    use-online-status.ts  → hook de estado de conexión
    mock-data.ts           → datos de ejemplo por tenant
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
- **Los tenants se cargan en el servidor y las integraciones por HTTP.**
  `app/page.tsx` es un Server Component que lee la lista de tenants (estable)
  directo del módulo de datos —sin pasar por HTTP— y se la pasa a `Dashboard`
  por props, así el cliente no espera un fetch previo para poder pedir las
  integraciones (antes eran dos en serie). Las integraciones, que son el dato
  volátil, el cliente las pide por HTTP a los route handlers de `app/api`; no
  se renderizan en el servidor a propósito porque prerenderizarlas congelaría
  sus timestamps en el momento del build y desalinearía las fechas entre la
  zona horaria del servidor y la del navegador (hydration mismatch). El paso
  siguiente sería pedirlas también en el servidor con `revalidate` y un
  `Suspense` para hacer streaming del resto de la página.
- **El cliente consume una REST, no importa mocks.** `lib/api.ts` sólo conoce
  URLs y tipos; `lib/http.ts` centraliza el transporte: errores tipados con
  `ApiError`, reintentos con backoff sólo para fallos transitorios (red, 5xx, 429) y cancelación por `AbortSignal` al cambiar de cliente. El servidor
  marca cada respuesta con `x-fetched-at`, y el dashboard muestra "estado
  actualizado hace X": cuando la respuesta sale del caché del service worker,
  esa marca es la del momento en que se bajó, así el usuario sabe de cuándo
  son los datos que está viendo. Sin conexión, aparece un aviso (`useOnlineStatus`).
- **Mutaciones por route handler, no por Server Action.** La guía de Next
  prefiere Server Actions para mutaciones disparadas desde la UI; acá el
  reintento es un `POST` a un route handler a propósito, porque el objetivo es
  demostrar el consumo de una REST (métodos, códigos de estado, errores y
  reintentos) y porque el service worker necesita una URL real para cachear el
  `GET` por cliente. Un Server Action es más idiomático para la mutación, pero
  no se puede consumir desde afuera ni cachear; con una API externa de verdad,
  el route handler es el camino.
- **`error.tsx` + `not-found.tsx`.** El App Router trae límites de error y 404
  por segmento; se agregaron para no caer en las pantallas genéricas de Next y
  mantener el idioma y el estilo del panel. `/api/health` cubre el health check
  del checklist de self-hosting.
- **Modo offline con una estrategia por tipo de recurso** (`public/sw.js`). El
  HTML y el manifest van con red primero, para no servir nunca una build
  vieja estando online, y caen al caché solo sin conexión. Las respuestas de
  `/api` también van con red primero, pero se cachean por URL: como la URL
  incluye el cliente, cada tenant guarda su propio último estado conocido y el
  panel sigue mostrando datos reales sin conexión. Los archivos de
  `/_next/static` llevan hash en el nombre y nunca cambian, así que van con
  caché primero, con un tope de entradas que descarta primero los de builds
  viejas (sin tope crecerían sin límite entre deploys). Ese mismo tope se
  aplica al precache de la instalación, no sólo a las respuestas nuevas. Al
  instalarse, el service worker baja los assets que lista el HTML, porque la
  primera visita los pide antes de que él controle la página. En desarrollo se
  desregistra: con chunks que cambian en cada edición, un caché primero
  dejaría el código viejo.
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

- **Sin backend ni base de datos real.** Los route handlers de `app/api` leen
  los mocks en memoria (`lib/server/data.ts`) y los normalizan; no hay base de
  datos ni estado compartido entre instancias. Por eso el reintento no persiste
  en el servidor: el cliente manda el estado que conoce y el servidor lo
  transforma. Con un backend real, el servidor sería el dueño del estado. Un
  backend de verdad sería otro proyecto entero.
- **Sin colas ni workers reales.** El botón "Reintentar" simula una
  sincronización con una promesa que resuelve en ~700ms; no hay RabbitMQ ni
  nada parecido detrás. La arquitectura (adapter + estado por evento) es la
  misma que necesitaría una integración real; el transporte no lo es.
- **Sin paginado.** Las integraciones de un cliente son pocas y entran en una
  sola respuesta; paginar una lista de cuatro sería inventar complejidad. La
  capa HTTP igual está lista para agregarlo (query params + `next`/`cursor`)
  el día que una integración real devuelva miles de eventos.
- **Sin autenticación.** No hay usuarios ni permisos: el selector de tenant
  es solo de front, no hay multi-tenancy real de datos ni de acceso.
- **Sin microservicios.** Todo vive en una sola app Next.js. Separar esto en
  servicios sería sobre-ingeniería para lo que este proyecto necesita
  demostrar.
- **Sin fallas de red provocadas a propósito.** El transporte reintenta con
  backoff y la UI muestra un error con botón para recargar si algo falla
  (`ApiError` en `lib/http.ts`, panel de error en `Dashboard`), pero los route
  handlers mockeados nunca devuelven 5xx: ese camino se ejercita en los tests,
  no en la demo. Provocarlo en runtime sería inventar un caso que el mock no
  tiene.
- **SonarCloud está en el pipeline pero requiere configuración propia** (un
  `SONAR_TOKEN` y una organización de SonarCloud): el workflow saltea ese
  paso si no hay token, en vez de romper el CI de quien clone el repo. Trivy
  no necesita configuración y corre siempre.
