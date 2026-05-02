# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

```
marketplace/                         ← git root
├── multi-verticals-proyect/         ← Allcoba monorepo (main project)
│   ├── CLAUDE.md                    ← detailed architecture reference
│   ├── services/                    ← 10 microservices (ports 3000–3009)
│   ├── packages/                    ← kernel, domain, shared-types, design-tokens
│   ├── apps/                        ← web (Next.js 15), mobile (Flutter)
│   ├── infra/                       ← docker-compose, migrations, seeds
│   └── docs/architecture/           ← 28 architecture documents
└── external/                        ← reference materials (Wallapop clone, Figma, inspiración)
```

All active development happens inside `multi-verticals-proyect/`. Run every command from that directory unless noted otherwise.

## Commands

```bash
cd multi-verticals-proyect

pnpm install                                 # install all workspace deps
pnpm dev                                     # start all services (turbo dev)
pnpm build                                   # build all packages in dep order
pnpm test                                    # run all tests (vitest via turbo)
pnpm test:coverage                           # with v8 coverage (80% threshold)
pnpm lint                                    # turbo lint + eslint root
pnpm typecheck                               # tsc --noEmit across all packages
pnpm format                                  # prettier --write
pnpm clean                                   # remove dist/ and coverage/

# Run a single package
pnpm --filter @allcoba/kernel test
pnpm --filter @allcoba/domain typecheck
pnpm --filter @allcoba/design-tokens build
```

## Project: Allcoba

Multi-vertical privacy-first marketplace connecting **Presenters** (providers) with **Choosers** (consumers). MVP verticals: Dating · Automotive. The platform never handles payments and cannot read user Layer-3 data (encrypted with the user's own DEK).

## Architecture

10 microservices behind a single API Gateway, sharing one PostgreSQL 16 instance (PostGIS · pgcrypto · pgvector). See `multi-verticals-proyect/CLAUDE.md` for the full architecture diagram, service responsibilities, and port assignments.

**Hexagonal architecture** in every service: `Infrastructure → Application → Domain`. The domain layer never imports infrastructure.

```typescript
// ✅ correct cross-package imports
import { logger } from "@allcoba/kernel";
import { User }   from "@allcoba/domain";
import { NotificationType } from "@allcoba/shared-types";

// ❌ never import directly from another service's src/
```

## Non-negotiable rules

- **JWT verified locally** (RS256 public key in env) — never call auth-service per request.
- **Internal headers** (`X-User-Id`, `X-User-Role`, `X-Session-Id`, `X-Vertical`, `X-Request-Id`) are written by the gateway and trusted by internal services. Never trust them from external clients.
- **Tenant isolation** — `userId` always from the verified JWT, never from body / params / query string.
- **Zero secrets in logs** — Pino redact covers: `dek, kek, password, token, secret, authorization, derivedKey, *.dek, *.kek, req.headers.authorization`.
- **Async communication via pg-boss queue** — services never call each other by HTTP for async operations.
- **DEK never persisted** — lives only in the gateway's in-process `sessionStore` (TTL-bound).
- **Port + Adapter** for every external dependency — switching providers means a new adapter, not touching use cases.

## Tech stack summary

| Layer | Technology |
|---|---|
| Gateway + services | Node.js 22 · Fastify · Zod · TypeScript |
| ORM | Drizzle ORM |
| Database | PostgreSQL 16 + PostGIS + pgcrypto + pgvector |
| Job queue | pg-boss (SKIP LOCKED) |
| Frontend | Next.js 15 App Router + Tailwind v4 |
| Mobile | Flutter + Riverpod |
| Storage | Cloudflare R2 |
| Local AI | Llama 3.2 3B · ONNX · all-MiniLM-L6-v2 |
| Testing | Vitest · Testcontainers · Supertest |

No Firebase. No Prisma. No Pinecone. No paid licenses.

## Naming conventions

| Pattern | Convention |
|---|---|
| Use cases | verb infinitive — `RegisterUser`, `ModerateImage` |
| Ports | `Port` suffix — `StoragePort`, `QueuePort` |
| Adapters | `Adapter` suffix — `R2StorageAdapter`, `DrizzleUserAdapter` |
| Domain errors | `Error` suffix — `InvalidCredentialsError` |
| Queue job names | kebab-case — `'moderate-image'`, `'send-notification'` |

## Per-service detail

Each service has its own `CLAUDE.md` under `services/<name>/CLAUDE.md` with environment variables, internal flows, and service-specific constraints. The canonical architecture reference is `multi-verticals-proyect/CLAUDE.md`.
