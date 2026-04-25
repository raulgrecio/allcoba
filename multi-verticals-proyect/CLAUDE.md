# CLAUDE.md — Marketplace Multi-Vertical

> Este fichero es leído automáticamente por Claude Code en cada sesión.
> Contiene las decisiones de arquitectura, principios y convenciones del proyecto.
> Documentación detallada por módulo en `docs/architecture/`.

---

## Qué es este proyecto

**Two-sided marketplace multi-vertical** con privacidad reforzada.
Conecta providers (vendedores/negocios) con consumers (compradores/clientes) en verticales independientes (peluquerías, inmobiliaria, automoción, masajes…).

- La plataforma **nunca gestiona pagos** — sólo facilita el contacto
- Los datos de los clientes de cada provider son **propiedad de ese provider**
- La plataforma **no puede leer** los datos personales de ningún cliente
- Modelo de monetización: **subscription fee al provider** (pendiente de activar)

---

## Principios de arquitectura — NO negociables

1. **Arquitectura hexagonal** (Ports & Adapters). El dominio no importa nada de infraestructura. Si un test de dominio necesita importar Fastify, Drizzle o PostgreSQL, es un error de arquitectura.

2. **Vertical slicing**. Cada vertical del negocio (peluquería, inmobiliaria…) es un módulo independiente en `src/modules/<vertical>/`. Comparten un kernel (`src/kernel/`) pero nunca se importan entre sí.

3. **Dependency rule**: las dependencias apuntan siempre hacia el centro.
   ```
   Infrastructure → Application → Domain
   ```
   El dominio no sabe que existe una base de datos.

4. **Tenant isolation total**. Nunca construyas una query que pueda devolver datos de otro provider. El `provider_id` siempre viene del JWT verificado, nunca del body/query string.

5. **Zero secrets en logs**. El wrapper de logger redacta automáticamente: `dek`, `password`, `token`, `secret`, `key`, `authorization`. Si necesitas loguear algo relacionado, loguea sólo el hash o el prefijo.

6. **Sustitución sin reescritura**. Cada servicio externo (cola de jobs, search, cache, storage) tiene un puerto (interfaz TypeScript) y un adapter. Cambiar de proveedor = escribir un nuevo adapter, no tocar use cases.

---

## Stack tecnológico

| Capa | Tecnología | Alternativa futura |
|------|-----------|-------------------|
| API | Node.js 22 + Fastify + TypeScript | — |
| ORM | Drizzle ORM | — |
| Base de datos | PostgreSQL 16 + PostGIS + pgcrypto | — |
| Cola de jobs | pg-boss (PostgreSQL) | BullMQ + Redis |
| Full-text search | PostgreSQL tsvector + GIN | Typesense / Meilisearch |
| Cache | LRU in-process + Materialized views | Redis |
| Web frontend | Astro + React islands + Tailwind v4 | — |
| App móvil | Flutter + Riverpod | — |
| Mapas | MapLibre GL (web) + flutter_map (app) | — |
| Storage de media | Cloudflare R2 | Backblaze B2 |
| IA local | Llama 3.2 3B / ONNX Runtime | — |
| Logger | Pino con wrapper propio | — |
| Testing | Vitest + Testcontainers + Supertest | — |
| CI/CD | GitHub Actions | — |

**Sin Firebase. Sin Prisma. Sin Next.js. Sin licencias de pago.**

---

## Estructura del monorepo

```
/
├── CLAUDE.md                  ← este fichero
├── apps/
│   ├── api/                   ← Fastify API
│   │   └── CLAUDE.md          ← contexto específico de la API
│   ├── web/                   ← Astro frontend
│   │   └── CLAUDE.md
│   └── mobile/                ← Flutter app
│       └── CLAUDE.md
├── packages/
│   ├── domain/                ← entidades y reglas de negocio puras
│   ├── kernel/                ← auth, logger, crypto, queue (compartido)
│   └── shared-types/          ← tipos TypeScript compartidos entre apps
├── workers/
│   ├── ai-pipeline/           ← análisis IA de conversaciones y media
│   └── etl-scraper/           ← scraping y normalización de datos externos
├── docs/
│   └── architecture/
│       ├── 01-database.md
│       ├── 02-encryption.md
│       ├── 03-auth-security.md
│       ├── 04-tenant-isolation.md
│       ├── 05-ai-pipeline.md
│       ├── 06-queue-system.md
│       └── 07-threat-model.md
└── infra/
    ├── docker-compose.yml     ← entorno local completo
    └── migrations/            ← Drizzle migrations versionadas
```

---

## Convenciones de código

### Nombrado
- **Use cases**: verbo en infinitivo — `SearchProviders`, `PublishListing`, `RateInteraction`
- **Ports**: sufijo `Port` — `ProviderRepositoryPort`, `StoragePort`, `QueuePort`
- **Adapters**: sufijo `Adapter` — `DrizzleProviderAdapter`, `R2StorageAdapter`
- **Entidades de dominio**: sustantivo en PascalCase — `Provider`, `Listing`, `TrustScore`
- **Errores de dominio**: sufijo `Error` — `ProviderNotFoundError`, `TenantViolationError`

### Estructura de un módulo vertical
```
src/modules/hairdresser/
├── domain/
│   ├── entities/          ← Provider, Service, Package, Customer
│   ├── value-objects/     ← ServiceType, PriceRange, Location
│   └── errors/
├── application/
│   ├── use-cases/         ← un fichero por use case
│   └── ports/             ← interfaces que la infra debe implementar
└── infrastructure/
    ├── persistence/       ← adapters de Drizzle
    ├── http/              ← routes de Fastify
    └── schema/            ← schema de Drizzle para este módulo
```

### Testing
- **Unit** (dominio y use cases): Vitest, sin IO real, sin base de datos
- **Integration**: Testcontainers lanza PostgreSQL real en Docker
- **E2E**: Supertest contra la API completa con DB de test
- Cobertura mínima exigida: **80% en domain + application**
- Los tests de integración usan la variable `TEST_DATABASE_URL`

### Errores y respuestas HTTP
- Los errores de dominio son clases tipadas, nunca strings sueltos
- El handler de errores de Fastify los mapea a HTTP — este mapeo está en `apps/api/src/error-handler.ts`
- Nunca lanzar errores HTTP desde el dominio

---

## Seguridad — reglas que Claude Code debe respetar siempre

1. El `provider_id` para queries de datos sensibles **siempre** viene de `request.user.providerId` (JWT), nunca de params/body.
2. Toda query a tablas de customers debe pasar por el middleware `enforceTenantIsolation`.
3. Las DEK (claves de cifrado) **nunca** se loguean, nunca se serializan a JSON de respuesta, nunca se guardan en disco.
4. Los endpoints que acceden a datos cifrados requieren que la DEK esté en la sesión activa — si no está, devuelven 401, no 500.
5. Inputs del usuario que van al modelo de IA se truncan a 2000 caracteres y se sanitizan antes de pasarlos al prompt.

---

## Documentación de referencia

- Modelo de cifrado completo → `docs/architecture/02-encryption.md`
- Threat model y contramedidas → `docs/architecture/07-threat-model.md`
- Diseño de la cola sin Redis → `docs/architecture/06-queue-system.md`
- Aislamiento entre tenants → `docs/architecture/04-tenant-isolation.md`
- Pipeline de IA sobre datos cifrados → `docs/architecture/05-ai-pipeline.md`
