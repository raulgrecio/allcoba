# 09 · Observabilidad

> Stack: **Pino** (logs) + **Prometheus** (métricas) + **Sentry** free tier (errores)
> Sin Datadog. Sin New Relic. Sin licencias. Self-hosted donde sea posible.

---

## Wrapper de logger

El wrapper es la única forma de instanciar el logger en todo el proyecto. Ningún módulo importa Pino directamente — todos importan el wrapper. Esto permite cambiar el transporte o el formato sin tocar nada más.

```typescript
// packages/kernel/src/logger/index.ts
import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',

  // Campos redactados SIEMPRE — seguridad
  redact: {
    paths: [
      'dek', 'kek', 'password', 'passwordHash',
      'token', 'secret', 'authorization',
      'derivedKey', 'kekEnc', 'dekEnc',
      '*.dek', '*.kek', '*.password',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },

  // Formato legible en desarrollo, JSON en producción
  transport: isDev
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
    : undefined,

  // Campos base en cada log
  base: {
    service: process.env.SERVICE_NAME ?? 'api',
    env: process.env.NODE_ENV,
  },
})

// Logger con contexto de request — usar en handlers
export function requestLogger(requestId: string, tenantId?: string) {
  return logger.child({ requestId, tenantId })
}

// Logger con contexto de job — usar en workers
export function jobLogger(jobId: string, queue: string) {
  return logger.child({ jobId, queue })
}
```

---

## Niveles de log y cuándo usar cada uno

| Nivel | Cuándo |
|-------|--------|
| `trace` | Sólo en desarrollo. Detalles de queries, pasos internos |
| `debug` | Diagnóstico en staging. Valores de variables clave |
| `info` | Eventos de negocio normales: login, listing publicado, job completado |
| `warn` | Situaciones anómalas pero recuperables: reintento de job, rate limit rozado |
| `error` | Errores que afectan a un usuario pero el sistema sigue |
| `fatal` | El proceso va a terminar. Crash de worker, DB inaccesible |

---

## Eventos de log estándar (convención de nombres)

```
auth.login.success          { providerId }
auth.login.failed           { email (hasheado), reason }
auth.mfa.failed             { providerId, attemptNumber }
provider.listing.published  { providerId, listingId, vertical }
contact.initiated           { conversationId, vertical }
ai.conversation.tagged      { conversationId, vertical, tagsCount }
ai.image.approved           { imageId, vertical, nsfwScore }
ai.image.rejected           { imageId, vertical, reason }
queue.job.failed            { jobId, queue, error, attemptNumber }
anomaly.bulk_read           { providerId, count, windowMs }
```

---

## Métricas con Prometheus

```typescript
// packages/kernel/src/metrics/index.ts
import { Registry, Counter, Histogram, Gauge } from 'prom-client'

export const metrics = {
  httpRequestDuration: new Histogram({
    name: 'http_request_duration_ms',
    help: 'Duración de requests HTTP',
    labelNames: ['method', 'route', 'status'],
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000],
  }),

  jobsProcessed: new Counter({
    name: 'queue_jobs_processed_total',
    help: 'Jobs procesados',
    labelNames: ['queue', 'status'],
  }),

  activeProviderSessions: new Gauge({
    name: 'active_provider_sessions',
    help: 'Providers con sesión activa (DEK en memoria)',
  }),

  searchQueryDuration: new Histogram({
    name: 'search_query_duration_ms',
    help: 'Duración de queries de búsqueda',
    labelNames: ['vertical'],
    buckets: [10, 25, 50, 100, 250, 500],
  }),
}

// Endpoint de métricas (sólo accesible internamente)
fastify.get('/internal/metrics', async (_, reply) => {
  reply.header('Content-Type', register.contentType)
  return register.metrics()
})
```

---

## Alertas mínimas (Grafana Cloud free tier)

| Alerta | Condición | Severidad |
|--------|-----------|-----------|
| API lenta | p95 latencia > 500ms durante 5 min | warning |
| Error rate alto | >5% de requests con 5xx en 2 min | critical |
| Job queue creciendo | >100 jobs pending durante 10 min | warning |
| Worker caído | 0 jobs procesados en 5 min (si hay pending) | critical |
| Bulk read anómalo | counter anomaly.bulk_read > 0 | warning |

---

## Error tracking con Sentry

```typescript
// apps/api/src/plugins/sentry.ts
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,  // free tier: 5K errores/mes
  environment: process.env.NODE_ENV,
  // NUNCA enviar datos personales a Sentry
  beforeSend(event) {
    // Eliminar cualquier dato que pueda ser PII
    if (event.request?.cookies) delete event.request.cookies
    if (event.user) delete event.user.email
    return event
  },
})
```
