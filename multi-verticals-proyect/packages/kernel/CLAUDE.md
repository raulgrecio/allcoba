# CLAUDE.md — packages/kernel

> Servicios compartidos de infraestructura usados por todos los procesos.
> Lee también el CLAUDE.md raíz del proyecto antes de trabajar aquí.

---

## Qué vive aquí

Código de infraestructura reutilizable entre `apps/api`, `workers/ai-pipeline` y `workers/etl-scraper`. Todo lo que no es dominio pero se usa en más de un proceso.

```text
packages/kernel/src/
├── logger/
│   └── index.ts              ← wrapper de Pino con redact automático de secretos
├── crypto/
│   ├── encrypt-columns.ts    ← encryptField / decryptField (AES-256-GCM)
│   ├── kdf.ts                ← deriveKeyFromPassword (PBKDF2, 100K iteraciones)
│   └── consumer-hash.ts      ← computeConsumerHash (SHA-256 + platform salt)
├── queue/
│   ├── queue.port.ts         ← interfaz QueuePort
│   └── pgboss.adapter.ts     ← implementación con pg-boss
├── search/
│   ├── search.port.ts        ← interfaz SearchPort + EmbeddingPort
│   └── postgres.adapter.ts   ← implementación con tsvector + pgvector
├── storage/
│   ├── storage.port.ts       ← interfaz StoragePort
│   └── r2.adapter.ts         ← implementación con Cloudflare R2
├── db/
│   ├── connection.ts         ← pool de conexiones Drizzle
│   ├── tenant-context.ts     ← withTenantContext() — establece RLS en PostgreSQL
│   └── schema-manager.ts     ← createProviderSchema() al registrar un provider
├── session/
│   └── session-store.ts      ← store en memoria para DEK con TTL (sin Redis)
└── metrics/
    └── index.ts              ← contadores y histogramas Prometheus
```

---

## El logger — uso correcto

```typescript
import { logger, requestLogger, jobLogger } from '@allcoba/kernel'

// En handlers de Fastify — siempre con requestId y tenantId
const log = requestLogger(request.id, request.user.sub)
log.info({ action: 'customer.list' }, 'listing customers')

// En workers — siempre con jobId y nombre de cola
const log = jobLogger(job.id, 'analyze-conversation')
log.info({ conversationId }, 'processing conversation')

// Nunca loguear estos campos — el redact los cubre pero no dependas de ello
// dek, kek, password, passwordHash, token, secret, authorization, derivedKey
```

---

## El sessionStore — DEK en memoria con TTL

```typescript
// packages/kernel/src/session/session-store.ts

// Store en memoria del proceso — la DEK vive aquí durante la sesión activa
// TTL = 15 minutos (igual que el JWT access token)
// Al expirar el JWT, la DEK también desaparece
// ⚠️ MVP: single-instance. Migrar a Redis para multi-instancia.

class SessionStore {
  private store = new Map<string, { dek: Uint8Array; expiresAt: number }>()

  set(sessionId: string, dek: Uint8Array, ttlMs = 15 * 60 * 1000): void {
    this.store.set(sessionId, { dek, expiresAt: Date.now() + ttlMs })
  }

  get(sessionId: string): Uint8Array | null {
    const entry = this.store.get(sessionId)
    if (!entry || entry.expiresAt < Date.now()) {
      this.store.delete(sessionId)
      return null
    }
    return entry.dek
  }

  delete(sessionId: string): void {
    this.store.delete(sessionId)
  }
}

export const sessionStore = new SessionStore()
```

---

## Ports disponibles — referenciar siempre por interfaz

```typescript
// Importar siempre el port, nunca el adapter directamente
// El adapter se inyecta en el contenedor de dependencias

import type { QueuePort }    from '@allcoba/kernel'
import type { SearchPort }   from '@allcoba/kernel'
import type { StoragePort }  from '@allcoba/kernel'
import type { EmbeddingPort } from '@allcoba/kernel'
```

---

## Tests del kernel

Los adapters del kernel se testean con Testcontainers (PostgreSQL real, R2 mockeado con MinIO local). Los ports no necesitan tests — son interfaces TypeScript.

```bash
pnpm test:unit          # utils, crypto, session-store
pnpm test:integration   # adapters con contenedores reales
```
