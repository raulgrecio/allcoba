# Skill: Microservicios

Cómo se comunican los servicios de Allcoba entre sí.
Leer antes de escribir cualquier código que llame a otro servicio o publique jobs.

---

## Regla fundamental

Los servicios NO se importan entre sí directamente.
Se comunican por dos vías exclusivamente:
- **HTTP interno** — para operaciones síncronas donde el cliente espera respuesta
- **Cola de jobs (pg-boss)** — para todo lo demás

```typescript
// ❌ INCORRECTO — importar código de otro servicio
import { UserService } from '../../auth-service/src/...'

// ✅ CORRECTO — llamada HTTP interna
const user = await internalClient.get(`/users/${userId}`, context)

// ✅ CORRECTO — job asíncrono
await queue.publish('send-notification', { type, recipientId, data })
```

---

## Headers internos — leer, nunca escribir

Los servicios internos solo leen los headers que el gateway inyecta.
Nunca modifican ni añaden headers `X-*`:

```typescript
// ✅ CORRECTO — leer contexto del gateway
export function extractContext(request: FastifyRequest): ServiceContext {
  return {
    userId:      request.headers['x-user-id']      as string,
    userRole:    request.headers['x-user-role']    as UserRole,
    sessionId:   request.headers['x-session-id']   as string,
    vertical:    request.headers['x-vertical']     as string,
    requestId:   request.headers['x-request-id']   as string,
    dekAvailable: request.headers['x-dek-available'] === 'true',
  }
}

// ❌ INCORRECTO — escribir headers internos (solo el gateway lo hace)
request.headers['x-user-id'] = 'otro-usuario'
```

---

## Llamadas HTTP internas — cliente tipado

```typescript
// packages/kernel/src/http/internal-client.ts

export class InternalHttpClient {
  constructor(
    private readonly baseUrl: string,
    private readonly serviceName: string,
  ) {}

  async get<T>(path: string, context: ServiceContext): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        'x-user-id':    context.userId,
        'x-user-role':  context.userRole,
        'x-session-id': context.sessionId,
        'x-request-id': context.requestId,
        'x-internal':   'true',
      },
    })
    if (!res.ok) throw new InternalServiceError(this.serviceName, res.status)
    return res.json() as T
  }

  async post<T>(path: string, body: unknown, context: ServiceContext): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method:  'POST',
      headers: {
        'content-type': 'application/json',
        'x-user-id':    context.userId,
        'x-user-role':  context.userRole,
        'x-request-id': context.requestId,
        'x-internal':   'true',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new InternalServiceError(this.serviceName, res.status)
    return res.json() as T
  }
}
```

---

## Cola de jobs — publicar y consumir

```typescript
// Publicar un job (en cualquier servicio)
await queue.publish('moderate-presenter-image', {
  imageId:    image.id,
  userId:     context.userId,
  vertical:   context.vertical,
  tempR2Path: uploadResult.path,
}, {
  priority:   10,      // alta prioridad — Presenter espera resultado
  retryLimit: 3,
  retryDelay: 30,
})

// Publicar job de baja prioridad (scraper)
await queue.publish('moderate-scraper-image', payload, {
  priority:   1,       // baja prioridad — batch
  retryLimit: 5,
  retryDelay: 300,
})

// Consumir jobs (en el servicio que los procesa)
await queue.work('moderate-presenter-image',
  { teamSize: 4 },
  async (job) => {
    const { imageId, userId, vertical, tempR2Path } = job.data
    await moderateImage({ imageId, userId, vertical, tempR2Path })
  }
)
```

---

## Contratos de jobs — en shared-types

Todos los tipos de jobs están definidos en `packages/shared-types/src/job-types.ts`.
Nunca usar strings mágicos ni objetos sin tipar:

```typescript
// packages/shared-types/src/job-types.ts

export interface ModeratePresenterImageJob {
  imageId:    string
  userId:     string
  vertical:   string
  tempR2Path: string
}

export interface SendNotificationJob {
  type:        NotificationType
  recipientId: string
  data:        Record<string, string>
  channels?:   ('push' | 'inapp' | 'email')[]
}

export interface AnalyzeConversationJob {
  conversationId: string
  providerId:     string
  vertical:       string
}

// Mapa de job name → tipo de payload
export interface JobPayloadMap {
  'moderate-presenter-image': ModeratePresenterImageJob
  'moderate-scraper-image':   ModerateScraperImageJob
  'send-notification':        SendNotificationJob
  'analyze-conversation':     AnalyzeConversationJob
  'generate-embedding':       GenerateEmbeddingJob
}
```

---

## Trazabilidad — requestId en todos los logs

El `requestId` (header `x-request-id`) debe aparecer en todos los logs
de todos los servicios que participan en un request:

```typescript
// En cada handler de servicio interno
const context = extractContext(request)
const log = requestLogger(context.requestId, context.userId)

log.info({ action: 'generating-deck', vertical: context.vertical }, 'deck generation started')
// → {"requestId":"abc123","userId":"uuid","action":"generating-deck",...}
```

Esto permite reconstruir el flujo completo de un request aunque haya pasado
por gateway → matching-service → search-service.

---

## Schemas de BD — nunca cruzar schemas

Cada servicio tiene sus propias tablas en su schema de PostgreSQL.
Los servicios no escriben en schemas ajenos. Solo leen de `shared` cuando es necesario:

```
auth-service     → WRITE auth.*,  READ shared.*
media-service    → WRITE media.*, READ shared.*
matching-service → WRITE matching.*, READ shared.*
...
```

Si un servicio necesita datos de otro, los obtiene via HTTP o via cola —
nunca accediendo directamente a las tablas del otro servicio.
