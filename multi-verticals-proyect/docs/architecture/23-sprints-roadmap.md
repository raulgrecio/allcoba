# 23 · Sprints y roadmap

> **Equipo:** 1 desarrollador
> **Verticales MVP:** Masajes + Automoción
> **Canal prioritario:** Web + App + Scraper (en paralelo desde Sprint 3)
> **Ritmo:** sprints de 1-2 semanas
> **Principio:** design system y brand antes que código de producto

---

## Visión general de fases

```
FASE 0 — Fundamentos (Sprints 1-2)
  Brand · Design system · Tokens · Componentes base
  Sin una línea de código de producto hasta tener esto cerrado.

FASE 1 — Core backend (Sprints 3-5)
  Base de datos · Auth · API base · Cifrado · Cola de jobs

FASE 2 — Verticales MVP (Sprints 6-9)
  Masajes y Automoción: providers, búsqueda, contacto

FASE 3 — App móvil + Scraper (Sprints 10-13)
  Flutter app · ETL pipeline · Sincronización de datos

FASE 4 — Features diferenciales (Sprints 14-17)
  Citas · Discovery swipe · Reputación · CRM

FASE 5 — Lanzamiento (Sprint 18)
  QA final · Seguridad · Deploy producción · Monitorización
```

---

## FASE 0 — Fundamentos de diseño

### Sprint 1 · Brand & Design Tokens (1-2 semanas)

**Objetivo:** Tener el lenguaje visual cerrado antes de escribir ni un componente.
Sin esto, web y app serán inconsistentes y habrá que rehacer trabajo.

**Entregables:**

```
Brand foundation:
  □ Naming y claim del proyecto
  □ Logo (versión principal + icono + versión monocroma)
  □ Paleta de color principal (primario, secundario, neutros)
  □ Paleta semántica (éxito, error, warning, info)
  □ Tipografía: 1 familia para UI + 1 para display (Google Fonts — sin licencia)
  □ Iconografía: decidir librería (Lucide, Phosphor — ambas MIT)
  □ Tono de comunicación: cómo habla la marca al provider y al consumer

Design tokens (el output más importante del sprint):
  □ tokens.json — fuente de verdad compartida entre web y app
      colors:     { primary, secondary, neutral, semantic }
      typography: { fontFamily, fontSize, fontWeight, lineHeight }
      spacing:    { 4px base grid: xs=4, sm=8, md=16, lg=24, xl=32, 2xl=48 }
      radius:     { sm=4, md=8, lg=16, full=9999 }
      shadows:    { sm, md, lg }
      motion:     { duration: { fast=100ms, base=200ms, slow=300ms } }

  □ Para web: tokens.css (variables CSS)
  □ Para app: tokens.dart (constantes Dart)
  □ Para Tailwind: tailwind.config.ts extendido con los tokens

Herramienta: Figma (free tier) para diseñar, tokens exportados a mano o
con el plugin Tokens Studio (free)
```

**Criterio de salida:** Los tokens están en el repo y tanto `tailwind.config.ts`
como `tokens.dart` los consumen. Cualquier componente que se cree a partir
de ahora usa sólo los tokens — nunca valores hardcoded.

---

### Sprint 2 · Design System & Componentes base (1-2 semanas)

**Objetivo:** Librería de componentes UI que usará toda la app.
Diseñar en Figma primero, implementar después.

**Componentes web (Astro + React + Tailwind):**

```
Átomos:
  □ Button (primary, secondary, ghost, destructive) + estados
  □ Input (text, search, select, textarea) + estados + error
  □ Badge (status, vertical label, trust score)
  □ Avatar (provider photo + fallback inicial)
  □ Icon wrapper
  □ Spinner / Skeleton loader

Moléculas:
  □ ProviderCard (foto, nombre, distancia, score, disponibilidad)
  □ ServiceTag (nombre del servicio + precio)
  □ TrustScoreMini (estrellas + número de reviews)
  □ AvailabilityBadge (abierto ahora / cierra a las X / cerrado)
  □ SearchBar (input + botón + filtros colapsables)
  □ FilterChip (seleccionable, con icono)
  □ Toast / Notification

Organismos:
  □ ProviderCardGrid (grid responsive de ProviderCards)
  □ MapView (MapLibre GL + markers de providers)
  □ ContactForm (formulario de contacto anónimo)
  □ NavBar (logo + búsqueda + acciones)
  □ BottomSheet (para mobile web — filtros, acciones)

Layouts:
  □ BaseLayout (head, nav, footer)
  □ VerticalLayout (header de vertical + contenido)
  □ ProviderLayout (ficha del provider)
```

**Componentes app (Flutter + tokens.dart):**

```
  □ AppButton (equivalente al Button web)
  □ AppInput
  □ ProviderCard (adaptado a mobile)
  □ BottomNavBar (4 tabs: Explorar, Guardados, Citas, Perfil)
  □ MapScreen widget base
  □ AppScaffold (scaffold con NavBar)
```

**Storybook para web:** cada componente documentado con sus variantes.
No es opcional — es la forma de validar que el sistema funciona antes de
integrarlo en páginas reales.

```bash
# Setup Storybook en apps/web
npx storybook@latest init
# Un fichero .stories.tsx por componente
```

**Criterio de salida:** Storybook levanta con todos los componentes.
Un diseñador (o tú mismo) puede revisar cada variante sin levantar la app completa.

---

## FASE 1 — Core backend

### Sprint 3 · Base de datos + Infraestructura local (1-2 semanas)

**Objetivo:** PostgreSQL funcionando localmente con todas las extensiones,
migraciones base aplicadas, y Docker Compose listo.

```
Infraestructura:
  □ docker-compose.yml completo (postgres + postgres_keys + api + workers)
  □ .env.example con todas las variables documentadas
  □ Scripts de setup: install, seed, reset

Base de datos:
  □ Extensiones instaladas: postgis, pgcrypto, pg_trgm, unaccent, vector
  □ Migraciones 0001-0010: extensiones, verticales, agencies, providers,
    trust_signals, media_assets, job_queue, swipe_signals,
    consumer_preferences, appointment_slots
  □ Schema manager: createProviderSchema() funcionando
  □ Seed de verticales: masajes + automoción con config completa

Drizzle ORM:
  □ Schema TypeScript de todas las tablas globales
  □ drizzle.config.ts configurado
  □ npm run migrate y npm run seed funcionando

Tests de infraestructura:
  □ Testcontainers: PostgreSQL real en tests
  □ Test: extensiones instaladas correctamente
  □ Test: createProviderSchema() crea todas las tablas del schema
  □ Test: SKIP LOCKED funciona con workers concurrentes
```

---

### Sprint 4 · Auth + Cifrado + Key Management (1-2 semanas)

**Objetivo:** El sistema de auth y cifrado completo y testeado.
Es el sprint más crítico de seguridad — hacerlo bien o no hacerlo.

```
Auth:
  □ RegisterProvider use case + adapter
  □ LoginProvider use case (con generación de DEK en sesión)
  □ RefreshToken use case
  □ Logout use case (invalida sesión + DEK)
  □ MFA setup (generación de QR TOTP)
  □ MFA verify (verificación de código)

Cifrado:
  □ deriveKeyFromPassword() — PBKDF2 100K iter
  □ encryptAESGCM() / decryptAESGCM()
  □ encryptField() / decryptField() — para columnas PII
  □ computeConsumerHash() — SHA-256 + platform salt
  □ sessionStore con TTL y zeroing de bytes

Key Management:
  □ key-service como módulo separado (acceso sólo a KM DB)
  □ storeKeys() / getProviderKeys() / rotateKeys()

Middleware Fastify:
  □ verifyJWT hook
  □ enforceTenantIsolation hook
  □ loadDEK hook (recupera DEK del sessionStore)
  □ Pino logger con redact de campos sensibles

Tests de seguridad (obligatorios antes de continuar):
  □ Test: DEK nunca aparece en logs
  □ Test: provider A no puede acceder a datos de provider B
  □ Test: token expirado devuelve 401
  □ Test: MFA incorrecto bloquea el login
  □ Test: rotación de KEK mantiene los datos accesibles
```

---

### Sprint 5 · API base + Cola de jobs (1 semana)

**Objetivo:** Fastify con todos los plugins, pg-boss funcionando,
y el esqueleto de módulos de la API.

```
API Fastify:
  □ app.ts con todos los plugins registrados (jwt, cors, helmet, rate-limit)
  □ error-handler.ts con todos los errores de dominio mapeados
  □ Estructura de módulos: auth, providers, consumers, conversations
  □ GET /health — healthcheck con estado de BD y cola
  □ GET /internal/metrics — Prometheus (sólo red interna)

Cola de jobs (pg-boss):
  □ PgBossAdapter implementando QueuePort
  □ Worker base: arranque, graceful shutdown, logging de jobs
  □ Job: send-notification (stub — sin FCM todavía)
  □ Cron: cancel-unconfirmed-appointments

Testing:
  □ Test E2E: flujo completo register → login → refresh → logout
  □ Test: rate limiting bloquea tras N intentos
  □ Test: job publicado se procesa exactamente una vez (SKIP LOCKED)
```

---

## FASE 2 — Verticales MVP

### Sprint 6 · Vertical Masajes — Provider side (1-2 semanas)

**Objetivo:** Un provider de masajes puede registrarse, completar su ficha,
subir fotos y publicar su catálogo de servicios.

```
Dominio:
  □ Provider entity con value objects (Slug, GeoPoint, ServicePrice)
  □ Service entity con ServicePackage
  □ VerticalConfig para masajes (atributos, servicios, imageRules)

API endpoints:
  □ POST /api/v1/auth/register (provider)
  □ POST /api/v1/auth/login
  □ GET/PUT /api/v1/me/profile
  □ POST /api/v1/me/services
  □ GET/PUT/DELETE /api/v1/me/services/:id
  □ POST /api/v1/me/media (upload foto)
  □ PUT /api/v1/me/availability (configurar disponibilidad)

Media pipeline (básico):
  □ Upload a R2 → job de moderación
  □ NSFWJS: rechazar contenido explícito
  □ face-api: aplicar regla 'forbidden' para masajes
  □ sharp: generar variantes WebP

Web — panel del provider:
  □ /provider/register — formulario de alta
  □ /provider/dashboard — resumen del perfil
  □ /provider/profile — editar ficha
  □ /provider/services — gestionar catálogo
  □ /provider/media — galería de fotos

Tests:
  □ Test: crear provider y publicar servicio end-to-end
  □ Test: imagen NSFW es rechazada
  □ Test: imagen sin cara pasa (regla de masajes)
```

---

### Sprint 7 · Vertical Masajes — Consumer side + Búsqueda (1-2 semanas)

**Objetivo:** Un consumer puede buscar masajistas, ver su ficha y contactar.

```
Búsqueda:
  □ PostgresSearchAdapter con tsvector + PostGIS
  □ Índices verificados con EXPLAIN ANALYZE
  □ GET /api/v1/search?vertical=massage&lat=&lng=&radius=&q=

Web — consumer:
  □ /masajes — página de búsqueda (SSR)
      · SearchBar con filtros de la vertical
      · MapView con providers cercanos
      · ProviderCardGrid con resultados
  □ /masajes/:slug — ficha del provider (SSG)
      · Galería de fotos
      · Catálogo de servicios y precios
      · TrustScore + reviews
      · Disponibilidad (abierto/cerrado)
      · Botón "Contactar"
  □ SEO: Schema.org HealthAndBeautyBusiness para masajes
  □ Sitemap dinámico para la vertical masajes

Contacto anónimo:
  □ POST /api/v1/contact
  □ GET/POST /api/v1/conversations/:id/messages
  □ Flujo completo: consumer contacta → provider responde → notificación push

Tests:
  □ Test: búsqueda devuelve providers ordenados por distancia
  □ Test: búsqueda full-text encuentra "masaje relajante" → "masaje"
  □ Test: contacto anónimo — provider no ve datos del consumer
  □ LCP < 2.5s en /masajes/:slug (Lighthouse CI)
```

---

### Sprint 8 · Vertical Automoción (1-2 semanas)

**Objetivo:** Replicar el trabajo de los sprints 6-7 para automoción,
validando que el sistema de verticales es realmente genérico.

```
  □ VerticalConfig para automoción (atributos: tipo, marcas, financiación)
  □ Seed de datos de automoción
  □ Reglas de imágenes: sin caras, contexto de coches
  □ /coches — página de búsqueda
  □ /coches/:slug — ficha del provider
  □ SEO: Schema.org AutoDealer / AutoRepair
  □ Panel del provider adaptado a automoción

Validación del sistema de verticales:
  □ Añadir automoción NO requirió cambios en el código base
  □ Sólo configuración en el seed — si hubo que tocar código, refactorizar
```

---

### Sprint 9 · Reputación + Trust signals (1 semana)

**Objetivo:** El sistema de calificación mutua funcionando.

```
  □ Review entity con validación anti-manipulación
  □ POST /api/v1/reviews (consumer → provider)
  □ Contribución al trust score (provider → consumer, anónima)
  □ Recálculo de score del provider tras cada review
  □ Mostrar reviews en ficha pública del provider
  □ Detección de spike de reviews → cola de revisión humana

Tests:
  □ Test: sólo se puede calificar tras interacción verificada
  □ Test: cooldown de 24h funciona
  □ Test: el trust score se actualiza correctamente
  □ Test: la contribución al trust score del consumer es anónima
```

---

## FASE 3 — App móvil + Scraper

### Sprint 10 · Flutter app — Estructura base (1-2 semanas)

**Objetivo:** App funcionando con auth, navegación y los tokens de diseño.

```
  □ Estructura de carpetas clean architecture + Riverpod
  □ tokens.dart desde los design tokens del Sprint 1
  □ Componentes Flutter equivalentes a los web (Sprint 2)
  □ AppScaffold + BottomNavBar (Explorar, Guardados, Citas, Perfil)
  □ Auth completo: login, registro, MFA, refresh token en secure storage
  □ ApiClient (Dio) con interceptors de auth y manejo de errores
  □ Drift setup: cache offline de providers visitados
  □ FCM setup: recibir push notifications (sólo mensajería)

Tests Flutter:
  □ Widget test: login screen con credenciales incorrectas muestra error
  □ Widget test: BottomNavBar navega correctamente
  □ Unit test: ApiClient reintenta con refresh token al recibir 401
```

---

### Sprint 11 · Flutter app — Búsqueda y mapa (1-2 semanas)

**Objetivo:** El consumer puede buscar y explorar providers en la app.

```
  □ SearchScreen con filtros por vertical
  □ MapScreen con flutter_map + OSM tiles (sin licencia)
  □ Geolocalización del dispositivo
  □ ProviderProfileScreen: galería, servicios, contactar
  □ ContactScreen: enviar mensaje anónimo
  □ ConversationsScreen: lista de conversaciones activas
  □ Push notifications: navegar a conversación al recibir notificación
  □ Modo offline: ver providers cacheados sin conexión

Tests:
  □ Test: búsqueda con geolocalización mockeada devuelve resultados
  □ Test: modo offline muestra providers cacheados
  □ Golden test: ProviderCard en diferentes estados
```

---

### Sprint 12 · ETL Scraper — Masajes (1-2 semanas)

**Objetivo:** Pipeline de scraping para la vertical masajes funcionando.
Poblar la BD con providers reales para el lanzamiento.

```
  □ Playwright crawler configurado para fuentes de masajes
  □ Cheerio crawler para páginas estáticas
  □ Normalizer para masajes: extraer nombre, teléfono, dirección, servicios
  □ LLM extractor: Llama 3.2 3B para texto libre → servicios estructurados
  □ Entity resolution: matching por teléfono + dirección
  □ Image downloader → media pipeline de moderación
  □ pHash deduplication: no descargar imágenes duplicadas
  □ Scheduler: pg-boss cron diario a las 2am
  □ Dashboard básico: cuántos providers scrapeados, pendientes, con error

Tests:
  □ Test: normalizer extrae datos correctamente del HTML de fixture
  □ Test: entity resolution detecta duplicado por teléfono
  □ Test: SSRF guard bloquea URLs internas
  □ Test: robots.txt se respeta
```

---

### Sprint 13 · ETL Scraper — Automoción (1 semana)

```
  □ Normalizer para automoción
  □ Fuentes de datos de concesionarios y talleres
  □ Reglas de imágenes específicas (sin caras, contexto de coches)
  □ Validar que el 80% de providers scrapeados tienen foto aprobada
```

---

## FASE 4 — Features diferenciales

### Sprint 14 · Sistema de citas — Masajes (1-2 semanas)

**Objetivo:** Un masajista puede publicar su agenda y un consumer puede reservar.

```
  □ provider_schedule_templates: plantilla semanal
  □ provider_service_config: buffer por servicio (default = duración)
  □ GenerateSlotsFromTemplate use case
  □ GET /api/v1/providers/:slug/slots (público)
  □ POST /api/v1/appointments (reserva atómica con SELECT FOR UPDATE)
  □ PATCH /api/v1/me/appointments/:id/confirm|complete|no-show|cancel
  □ Agenda visual en web: vista día/semana/mes
  □ Agenda en Flutter app
  □ Recordatorios: jobs de 24h y 2h antes
  □ Cancelación automática tras 24h sin confirmar
  □ customer_stats: actualización por trigger tras cada cambio de estado

Tests:
  □ Test: doble reserva del mismo slot → sólo una tiene éxito
  □ Test: buffer de 30min entre citas — siguiente slot a t+90min
  □ Test: cancelación automática tras 24h sin confirmar
  □ Test: customer_stats se actualiza correctamente
```

---

### Sprint 15 · Discovery swipe (1-2 semanas)

**Objetivo:** El consumer puede explorar providers con swipe y el sistema aprende.

```
  □ swipe_signals tabla + consumer_preferences
  □ GenerateDeck use case con filtros de visibilidad
  □ POST /api/v1/discovery/:vertical/swipe
  □ Job: update-consumer-prefs (aprendizaje asíncrono)
  □ provider_consumer_relations: silenciado, bloqueado, preferido
  □ VisibilityChecker: canSee, canContact, routeMessage
  □ Deck UI en web: swipe cards con animación
  □ Deck UI en Flutter: GestureDetector + animación de swipe
  □ Panel del provider: gestionar relaciones con consumers
  □ platform_bans: ban de plataforma (admin)

Tests:
  □ Test: consumer baneado recibe deck vacío
  □ Test: provider bloqueado no aparece en el deck
  □ Test: mensaje de consumer silenciado va a archivados sin notificación
  □ Test: preferencias aprenden correctamente tras 10 swipes
```

---

### Sprint 16 · CRM del provider (1 semana)

**Objetivo:** El provider tiene visibilidad completa de sus clientes y métricas.

```
  □ customer_stats: tabla con contadores en claro
  □ GET /api/v1/me/customers — lista con stats y etiquetas IA
  □ GET /api/v1/me/customers/:id — ficha completa con historial de citas
  □ GET /api/v1/me/stats/appointments — dashboard con métricas
  □ Pipeline IA: analyze-conversation job → etiquetas de cliente
  □ Filtros de clientes: por etiqueta, por no-show rate, por fecha última cita
  □ Exportar lista de clientes (CSV cifrado — descifrado en cliente)

Tests:
  □ Test: customer_stats refleja correctamente completed/cancelled/no_show
  □ Test: etiquetas IA no contienen PII
  □ Test: exportación cifrada no contiene datos en claro en el servidor
```

---

### Sprint 17 · pgvector + Búsqueda semántica (1-2 semanas)

**Objetivo:** Activar la búsqueda semántica con all-MiniLM-L6-v2.

```
  □ all-MiniLM-L6-v2 ONNX en el worker de IA
  □ Job: generate-embedding para cada provider al crear/actualizar bio
  □ Columna providers.embedding poblada para todas las verticales
  □ Índice HNSW creado (cuando providers > 1000)
  □ Hybrid search: tsvector (30%) + vector (40%) + geo (30%)
  □ Test A/B: comparar resultados con/sin búsqueda semántica
  □ "Quiero ponerme guapa para una boda" → encuentra servicios de novia

Tests:
  □ Test: embedding generado correctamente (384 dimensiones)
  □ Test: búsqueda semántica devuelve resultados más relevantes que full-text
         para queries en lenguaje natural
```

---

## FASE 5 — Lanzamiento

### Sprint 18 · QA + Seguridad + Deploy producción (1-2 semanas)

```
Seguridad:
  □ npm audit — 0 vulnerabilidades high/critical
  □ Penetration test básico: OWASP Top 10 checklist manual
  □ Verificar todos los tests de tenant isolation pasan
  □ Verificar que DEK nunca aparece en logs de producción
  □ Backups automáticos configurados y verificados (restore test)

Performance:
  □ EXPLAIN ANALYZE en todas las queries de producción
  □ Lighthouse CI: LCP < 2.5s, CLS < 0.1 en todas las páginas públicas
  □ Load test básico: 100 usuarios concurrentes en búsqueda

Deploy:
  □ Hetzner VPS configurado (o Railway para fase 0)
  □ Cloudflare Tunnel configurado
  □ Cloudflare Pages — web desplegada
  □ Variables de entorno en producción (nunca en código)
  □ Grafana Cloud: logs y alertas configuradas
  □ Sentry: error tracking activo
  □ Dominio + SSL configurado
  □ Smoke tests en producción tras el deploy

Contenido inicial:
  □ Mínimo 20 providers reales por vertical (vía scraper)
  □ Todos con foto aprobada + catálogo de servicios
  □ Distribuidos geográficamente en 2-3 ciudades objetivo
```

---

## Resumen visual de sprints

```
Sprint  │ Semanas │ Entregable principal
────────┼─────────┼──────────────────────────────────────────────
  1     │  1-2    │ Brand + Design tokens
  2     │  1-2    │ Design system + Storybook
  3     │  1-2    │ Base de datos + Docker Compose
  4     │  1-2    │ Auth + Cifrado + Key Management
  5     │   1     │ API base + Cola de jobs
  6     │  1-2    │ Masajes — panel del provider
  7     │  1-2    │ Masajes — búsqueda + contacto web
  8     │  1-2    │ Automoción — vertical completa
  9     │   1     │ Reputación + Trust signals
 10     │  1-2    │ Flutter app — estructura base
 11     │  1-2    │ Flutter app — búsqueda y mapa
 12     │  1-2    │ ETL Scraper — masajes
 13     │   1     │ ETL Scraper — automoción
 14     │  1-2    │ Citas — masajes (agenda + reservas)
 15     │  1-2    │ Discovery swipe + niveles de visibilidad
 16     │   1     │ CRM del provider
 17     │  1-2    │ Búsqueda semántica (pgvector)
 18     │  1-2    │ QA + Seguridad + Deploy producción
────────┼─────────┼──────────────────────────────────────────────
TOTAL   │ 20-30   │ semanas (5-7 meses a ritmo sostenible)
```

---

## Criterios de MVP mínimo viable (puede lanzarse tras Sprint 9)

Después del Sprint 9 ya tienes algo que puede llegar a usuarios reales:

```
✓ Providers de masajes y automoción pueden registrarse y publicar ficha
✓ Consumers pueden buscar por ubicación y ver fichas
✓ Contacto anónimo entre provider y consumer
✓ Sistema de reputación funcionando
✓ Web pública con SEO optimizado
✓ Datos iniciales via scraper (Sprint 12-13 se pueden adelantar)

Lo que NO tendrás aún en el MVP:
  · App móvil (viene en Sprints 10-11)
  · Citas / agenda (Sprint 14)
  · Swipe discovery (Sprint 15)
  · CRM avanzado (Sprint 16)
  · Búsqueda semántica (Sprint 17)
```

La decisión de lanzar tras el Sprint 9 o esperar a tener la app depende
de si tu público objetivo usa más móvil o web. Para automoción probablemente
web es suficiente para validar. Para masajes el móvil importa más.

---

## Reglas del proceso

```
1. Ningún sprint empieza sin que el anterior tenga sus tests pasando en CI
2. Ningún componente de producto se toca antes de cerrar el Sprint 2
3. Cada endpoint nuevo requiere EXPLAIN ANALYZE antes de mergear
4. Los tests de seguridad (tenant isolation, logs sin DEK) se ejecutan en cada sprint
5. Una vertical nueva = sólo configuración, nunca código nuevo en el core
6. Claude Code trabaja con el CLAUDE.md del módulo activo como contexto
```

---

## Deuda técnica permitida (a resolver antes del Sprint 18)

```
Sprint 6-9:  consumerNote en citas no se cifra hasta que el provider la lee
             (lazy encryption — aceptable para MVP)
Sprint 10:   FCM token se registra sin verificar propiedad del dispositivo
             (mejorar en Sprint 17 con device fingerprint)
Sprint 12:   El scraper no gestiona CAPTCHAs (skip + log para revisión manual)
```
