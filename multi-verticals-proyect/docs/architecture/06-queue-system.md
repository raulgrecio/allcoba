# 06 · Sistema de colas

> Stack: **pg-boss** (PostgreSQL SKIP LOCKED)
> Sin Redis. Sin RabbitMQ. Sin licencias. Migrable a BullMQ+Redis cambiando un adapter.

---

## Por qué PostgreSQL como cola

En fase inicial el volumen de jobs no justifica un servicio extra. PostgreSQL con `SKIP LOCKED` garantiza:
- Entrega at-least-once
- No dos workers procesan el mismo job (bloqueo a nivel de fila)
- Reintentos automáticos con backoff
- Visibilidad completa de jobs en la misma DB que el resto de datos
- Un servicio menos que operar, monitorizar y pagar

Cuando el volumen supere ~500 jobs/segundo sostenidos, se migra a BullMQ+Redis cambiando únicamente el adapter — el resto del código no cambia.

---

## Abstracción (Puerto)

```typescript
// packages/kernel/src/queue/queue.port.ts

export interface QueuePort {
  publish(queueName: string, payload: unknown, options?: JobOptions): Promise<string>
  work(queueName: string, options: WorkerOptions, handler: JobHandler): Promise<void>
  schedule(queueName: string, cronExpression: string, payload: unknown): Promise<void>
  cancel(jobId: string): Promise<void>
}

export interface JobOptions {
  delaySeconds?: number
  retryLimit?: number
  retryBackoff?: boolean
  singletonKey?: string  // evita duplicados
}

export interface WorkerOptions {
  teamSize?: number        // workers concurrentes para esta cola
  pollingIntervalSeconds?: number
}

export type JobHandler = (job: Job) => Promise<void>

export interface Job {
  id: string
  name: string
  data: unknown
  attemptNumber: number
}
```

---

## Adapter: pg-boss

```typescript
// packages/kernel/src/queue/pgboss.adapter.ts
import PgBoss from 'pg-boss'
import type { QueuePort, JobOptions, WorkerOptions, JobHandler } from './queue.port'

export class PgBossAdapter implements QueuePort {
  private boss: PgBoss

  constructor(databaseUrl: string) {
    this.boss = new PgBoss({
      connectionString: databaseUrl,
      retryLimit: 3,
      retryBackoff: true,
      retryDelay: 30,          // segundos antes del primer reintento
      expireInHours: 24,
      deleteAfterDays: 7,      // limpieza automática de jobs completados
      monitorStateIntervalSeconds: 30,
    })
  }

  async start(): Promise<void> {
    await this.boss.start()
    logger.info('Queue (pg-boss) started')
  }

  async publish(
    queueName: string,
    payload: unknown,
    options?: JobOptions
  ): Promise<string> {
    const jobId = await this.boss.send(queueName, payload, {
      startAfter: options?.delaySeconds ?? 0,
      retryLimit: options?.retryLimit ?? 3,
      retryBackoff: options?.retryBackoff ?? true,
      singletonKey: options?.singletonKey,
    })
    return jobId!
  }

  async work(
    queueName: string,
    options: WorkerOptions,
    handler: JobHandler
  ): Promise<void> {
    await this.boss.work(queueName, {
      teamSize: options.teamSize ?? 1,
      pollingIntervalSeconds: options.pollingIntervalSeconds ?? 2,
    }, async (job) => {
      await handler({
        id: job.id,
        name: job.name,
        data: job.data,
        attemptNumber: job.retryCount + 1,
      })
    })
  }

  async schedule(
    queueName: string,
    cronExpression: string,
    payload: unknown
  ): Promise<void> {
    await this.boss.schedule(queueName, cronExpression, payload)
  }
}
```

---

## Colas definidas en el sistema

| Cola | Descripción | teamSize | retryLimit |
|------|-------------|----------|------------|
| `moderate-image` | Moderación de imágenes subidas | 4 | 2 |
| `analyze-conversation` | Etiquetado IA de conversaciones | 2 | 3 |
| `scrape-vertical` | ETL scraping de una vertical | 2 | 5 |
| `entity-resolution` | Fusión de providers duplicados | 1 | 3 |
| `send-notification` | Envío de push/email | 3 | 5 |
| `refresh-search-index` | Actualizar materialized views | 1 | 2 |
| `compute-trust-score` | Recalcular score de consumer | 1 | 3 |

---

## Patrón Outbox (consistencia eventual)

Para operaciones que deben publicar un job Y persistir datos atómicamente:

```typescript
// El job se inserta en la misma transacción que los datos
// pg-boss puede usar la misma conexión de BD

async function publishListingWithJob(
  db: DatabaseConnection,
  listing: Listing
): Promise<void> {
  await db.transaction(async (tx) => {
    // 1. Guardar el listing
    await tx.insert(listings).values(listing)

    // 2. Publicar job en la misma transacción
    // Si la transacción falla, el job tampoco se publica
    await queue.publishInTransaction(tx, 'moderate-image', {
      listingId: listing.id,
      providerId: listing.providerId,
      imageUrls: listing.imageUrls,
    })
  })
}
```

---

## Migración futura a BullMQ + Redis

Cuando sea necesario, sólo hay que escribir un nuevo adapter:

```typescript
// packages/kernel/src/queue/bullmq.adapter.ts
import { Queue, Worker } from 'bullmq'
import type { QueuePort } from './queue.port'

export class BullMQAdapter implements QueuePort {
  // Implementa la misma interfaz QueuePort
  // El resto del código no cambia
}
```

Y cambiar la instancia en el contenedor de dependencias:

```typescript
// Antes:
container.bind(QueuePort).to(PgBossAdapter)

// Después:
container.bind(QueuePort).to(BullMQAdapter)
```
