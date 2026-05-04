# CLAUDE.md — Allcoba

> Este fichero es leído automáticamente por Claude Code en cada sesión.
> Contiene las decisiones de arquitectura, principios y convenciones del proyecto.
> Documentación detallada por módulo en `docs/architecture/`.

---

## Qué es este proyecto

**Allcoba** — plataforma de conexión multi-vertical con privacidad reforzada.
Conecta Presenters (quien ofrece) con Choosers (quien elige) en verticales independientes.
Verticales MVP: **Dating · Automoción**.

- La plataforma **nunca gestiona pagos**
- Los datos personales de cada usuario son **suyos** — cifrados con su propia clave
- La plataforma **no puede leer** datos de Capa 3 de ningún usuario
- El Chooser es **anónimo por defecto** — su identidad es su reputación acumulada
- El primer contacto lo inicia **siempre el Chooser** — el Presenter no puede escribir primero

---

## Arquitectura — Microservicios con BD compartida

```text
Internet
    │
    ▼
┌─────────────────────────────────┐
│         API Gateway             │  ← único puerto público (3000)
│  verifica JWT localmente        │  ← clave pública RS256 en env
│  extrae userId, role, sessionId │  ← propaga via headers internos
│  recupera DEK del sessionStore  │  ← memoria o Redis futuro
└──────────────┬──────────────────┘
               │ red interna privada
   ┌───────────┼───────────────────────────────────┐
   │           │           │           │           │
┌──┴──┐  ┌────┴───┐  ┌────┴───┐  ┌───┴────┐  ┌──┴──────┐
│auth │  │ media  │  │notifs  │  │search  │  │matching │
│svc  │  │  svc   │  │  svc   │  │  svc   │  │   svc   │
└─────┘  └────────┘  └────────┘  └────────┘  └─────────┘
   │           │           │           │           │
   └───────────┴───────────┴───────────┴───────────┘
                           │
              ┌────────────┴────────────┐
              │    PostgreSQL 16        │  ← BD compartida
              │  PostGIS · pgcrypto     │
              │  pgvector · pg_trgm     │
              └─────────────────────────┘
```

**Principio de rendimiento:** Los servicios internos NO llaman al auth-service en cada request.
El JWT se verifica localmente con la clave pública RS256. Las llamadas HTTP al auth-service
solo ocurren en login, registro, refresh y logout.

---

## Principios — NO negociables

1. **Arquitectura hexagonal** en cada servicio. El dominio no importa infraestructura.
   `Infrastructure → Application → Domain` — nunca al revés.

2. **JWT verificado localmente**. Cada servicio tiene la clave pública RS256 en su env.
   Nunca llaman al auth-service para verificar un token en requests normales.

3. **Headers internos del gateway**. Los servicios internos confían en:
   `X-User-Id`, `X-User-Role`, `X-Session-Id`, `X-Vertical`
   Nunca expuestos a internet — solo válidos en red interna.

4. **Tenant isolation total**. El `userId` siempre viene del JWT verificado (gateway),
   nunca del body, params o query string.

5. **Zero secrets en logs**. Pino redact cubre:
   `dek, kek, password, passwordHash, token, secret, authorization,
derivedKey, kekEnc, dekEnc, *.dek, *.kek, req.headers.authorization`

6. **Contratos entre servicios via shared-types**. Nunca strings mágicos.
   Cualquier cambio de contrato es un error de TypeScript antes de llegar a producción.

7. **Cola de jobs para comunicación asíncrona**. Los servicios NO se llaman entre sí
   por HTTP para operaciones asíncronas. Publican un job en la cola. El consumer
   del job puede estar en cualquier servicio.

8. **Sustitución sin reescritura**. Cada dependencia externa tiene un Port + Adapter.
   Cambiar de proveedor = nuevo adapter, no tocar use cases.

---

## Stack tecnológico

| Capa                | Tecnología                                    | Alternativa futura |
| ------------------- | --------------------------------------------- | ------------------ |
| Contrato API        | OpenAPI 3.0 + Orval (Schema-First)            | —                  |
| Gateway + Servicios | Node.js 22 + Fastify + Zod + TypeScript       | —                  |
| ORM                 | Drizzle ORM                                   | —                  |
| Base de datos       | PostgreSQL 16 + PostGIS + pgcrypto + pgvector | —                  |
| Cola de jobs        | pg-boss (SKIP LOCKED en PostgreSQL)           | BullMQ + Redis     |
| Cache de sesiones   | In-process Map con TTL                        | Redis (Upstash)    |
| Full-text search    | PostgreSQL tsvector + GIN + pg_trgm           | Typesense          |
| Búsqueda semántica  | pgvector + HNSW (preparado, no activo)        | —                  |
| Web frontend        | Next.js 15 App Router + Tailwind v4           | —                  |
| App móvil           | Flutter + Riverpod                            | —                  |
| Mapas               | MapLibre GL (web) + flutter_map (app)         | —                  |
| Storage media       | Cloudflare R2                                 | —                  |
| IA local            | Llama 3.2 3B + ONNX + all-MiniLM-L6-v2        | —                  |
| Logger              | Pino con wrapper propio                       | —                  |
| Testing             | Vitest + Testcontainers + Supertest           | —                  |
| CI/CD               | GitHub Actions                                | —                  |

**Sin Firebase. Sin Prisma. Sin Pinecone. Sin licencias de pago.**

---

## Estructura del monorepo

```text
allcoba/
├── CLAUDE.md                          ← este fichero
│
├── services/                          ← microservicios
│   ├── api-gateway/                   ← único puerto público
│   │   └── CLAUDE.md
│   ├── auth-service/                  ← JWT, MFA, KEK/DEK, sesiones
│   │   └── CLAUDE.md
│   ├── media-service/                 ← upload, moderación IA, storage
│   │   └── CLAUDE.md
│   ├── notification-service/          ← push FCM, email, in-app
│   │   └── CLAUDE.md
│   ├── search-service/                ← geo + full-text + vectorial
│   │   └── CLAUDE.md
│   ├── matching-service/              ← deck, swipe, preferencias
│   │   └── CLAUDE.md
│   ├── conversation-service/          ← chat, matches, contactos
│   │   └── CLAUDE.md
│   ├── appointment-service/           ← citas, agenda, CRM
│   │   └── CLAUDE.md
│   ├── reputation-service/            ← trust scores, reviews
│   │   └── CLAUDE.md
│   └── scraper-service/               ← ETL, entity resolution
│       └── CLAUDE.md
│
├── packages/                          ← código compartido (no servicios)
│   ├── domain/                        ← entidades puras, sin infraestructura
│   │   └── CLAUDE.md
│   ├── kernel/                        ← logger, crypto, queue port, db
│   │   └── CLAUDE.md
│   └── shared-types/                  ← contratos entre servicios (TypeScript)
│
├── apps/
│   ├── web/                           ← Next.js 15 App Router
│   │   └── CLAUDE.md
│   └── mobile/                        ← Flutter app
│       └── CLAUDE.md
│
├── infra/
│   ├── docker-compose.yml             ← entorno local completo
│   ├── docker-compose.test.yml        ← entorno de tests
│   ├── migrations/                    ← Drizzle migrations versionadas
│   └── seeds/                         ← datos iniciales
│
└── docs/
    ├── architecture/                  ← 28 documentos técnicos
    └── references/                    ← briefings para diseño y terceros
```

---

## Servicios — responsabilidades y puertos

| Servicio             | Puerto | Responsabilidad única                        |
| -------------------- | ------ | -------------------------------------------- |
| api-gateway          | 3000   | Enrutamiento, auth middleware, rate limiting |
| auth-service         | 3001   | JWT, MFA TOTP, KEK/DEK, sesiones, OTP        |
| media-service        | 3002   | Upload, moderación IA, variants WebP, R2     |
| notification-service | 3003   | Push FCM, email, in-app, reintentos          |
| search-service       | 3004   | Geo + full-text + vectorial                  |
| matching-service     | 3005   | Deck, swipe, preferencias, matches           |
| conversation-service | 3006   | Chat, mensajes, historial                    |
| appointment-service  | 3007   | Citas, agenda, CRM, buffers                  |
| reputation-service   | 3008   | Trust scores, reviews, anti-manipulación     |
| scraper-service      | 3009   | ETL, scraping, entity resolution             |

---

## Comunicación entre servicios

```text
SÍNCRONA (HTTP interno — solo cuando el cliente espera respuesta):
  api-gateway → auth-service      solo en: login, registro, refresh, logout
  api-gateway → search-service    búsquedas en tiempo real
  api-gateway → matching-service  deck del Chooser

ASÍNCRONA (cola pg-boss — para todo lo demás):
  cualquier servicio → publica job → consumer en otro servicio
  ejemplos:
    api-gateway publica 'moderate-image'   → media-service lo procesa
    matching-service publica 'send-notif'  → notification-service lo procesa
    appointment-service publica 'send-notif' → notification-service
    reputation-service publica 'update-score' → se procesa en background
```

---

## Headers internos del gateway

Estos headers los añade el gateway y los servicios internos los consumen.
**Nunca deben venir del cliente externo — el gateway los sobreescribe siempre.**

```typescript
// Lo que el gateway añade a cada request interno
'X-User-Id':      string    // UUID del usuario autenticado
'X-User-Role':    string    // 'presenter' | 'chooser' | 'platform_admin'
'X-Session-Id':   string    // para recuperar DEK del sessionStore
'X-Vertical':     string    // vertical activa del request
'X-Request-Id':   string    // para trazabilidad en logs
'X-Dek-Available': 'true' | 'false'  // si hay DEK activa para este usuario
```

---

## Estructura de src/ — regla fundamental

**Cada servicio, package y app tiene su propio `src/` independiente.**
No existe un `src/` global compartido.

```text
services/auth-service/src/      ← código exclusivo de auth
services/media-service/src/     ← código exclusivo de media
packages/kernel/src/            ← código compartido entre servicios
packages/domain/src/            ← entidades compartidas
packages/shared-types/src/      ← contratos TypeScript entre servicios
apps/web/src/                   ← Next.js 15 App Router
apps/mobile/lib/                ← Flutter usa lib/ por convención
```

**Por qué un src/ por servicio:**
Cada servicio tiene su propio `package.json`, `tsconfig.json` y `Dockerfile`.
Esto permite hacer `docker build` de un solo servicio sin compilar el monorepo completo,
y que cada servicio tenga solo las dependencias que necesita.

**Cómo importar código compartido:**

```typescript
// ✅ CORRECTO — desde packages/ compartidos
import { User } from '@allcoba/domain';
import { logger } from '@allcoba/kernel';
import { NotificationType } from '@allcoba/shared-types';

// ❌ INCORRECTO — nunca importar de otro servicio directamente
import { something } from '../../auth-service/src/...';
```

**Gestión del monorepo con pnpm workspaces + Turborepo:**

```json
// package.json raíz
{
  "name": "allcoba",
  "packageManager": "pnpm@10.32.1",
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "typecheck": "turbo typecheck"
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'services/*'
  - 'apps/*'
```

```bash
pnpm install                                            # instala todas las deps
pnpm --filter @allcoba/kernel test                      # test de un paquete
pnpm test                                               # turbo test (todos los paquetes)
```

---

## Convenciones de código

### Nombrado

- **Use cases**: verbo infinitivo — `RegisterUser`, `LoginUser`, `ModerateImage`
- **Ports**: sufijo `Port` — `UserRepositoryPort`, `StoragePort`, `QueuePort`
- **Adapters**: sufijo `Adapter` — `DrizzleUserAdapter`, `R2StorageAdapter`
- **Entidades**: sustantivo PascalCase — `User`, `Match`, `Appointment`
- **Errores de dominio**: sufijo `Error` — `InvalidCredentialsError`, `SessionExpiredError`
- **Jobs de cola**: kebab-case — `'moderate-image'`, `'send-notification'`
- **Headers internos**: `X-` prefix + PascalCase — `X-User-Id`, `X-Session-Id`

### Estructura interna de cada servicio

```text
services/auth-service/src/
├── domain/
│   ├── entities/        ← User, Session, MFASecret
│   ├── value-objects/   ← Email, Phone, HashedPassword
│   └── errors/          ← InvalidCredentialsError, etc.
├── application/
│   ├── use-cases/       ← un fichero por use case
│   └── ports/           ← interfaces TypeScript
├── infrastructure/
│   ├── persistence/     ← adapters Drizzle
│   ├── http/            ← routes Fastify
│   ├── crypto/          ← implementaciones crypto
│   └── schema/          ← schema Drizzle de este servicio
└── index.ts             ← entry point
```

### Testing por servicio

- **Unit**: Vitest, fakes in-memory, sin IO
- **Integration**: Testcontainers (PostgreSQL real)
- **Contract**: tests que verifican que los headers internos son correctos
- Cobertura mínima: **80% domain + application**

---

## Seguridad — reglas absolutas

1. **JWT verificado localmente** con clave pública — nunca llamar al auth-service por request normal
2. **Headers internos sobreescritos por el gateway** — nunca confiar en headers del cliente
3. **DEK nunca en logs, respuestas HTTP, ni disco** — solo en sessionStore con TTL
4. **userId siempre del JWT** — nunca de body, params, query string
5. **Secrets en .env** — nunca en código, nunca en logs
6. **Red interna privada** — los servicios no tienen puertos expuestos excepto el gateway

---

## Documentación de referencia

- **Arquitectura de microservicios** → `docs/architecture/28-microservices-architecture.md`
- Modelo de cifrado → `docs/architecture/02-encryption.md`
- Auth y seguridad → `docs/architecture/03-auth-security.md`
- Tenant isolation → `docs/architecture/04-tenant-isolation.md`
- Cola de jobs → `docs/architecture/06-queue-system.md`
- Threat model → `docs/architecture/07-threat-model.md`
- API design → `docs/architecture/08-api-design.md`
- Pipeline de media → `docs/architecture/16-media-pipeline.md`
- Pipeline de IA → `docs/architecture/05-ai-pipeline.md`
- Discovery swipe → `docs/architecture/21-discovery-swipe.md`
- Citas y CRM → `docs/architecture/22-appointments-crm.md`
- Sprints → `docs/architecture/23-sprints-roadmap.md`
- Perfil por capas → `docs/architecture/24-user-profile-layers.md`
- Matching model → `docs/architecture/25-matching-model.md`
- Resistencia Sybil → `docs/architecture/26-sybil-resistance.md`
- Pantallas → `docs/references/27-screen-map.md`
