# Skill: Fastify

Convenciones para escribir routes, plugins y middleware en Fastify.
Todos los servicios que exponen HTTP usan Fastify v4 + TypeScript.

---

## Construcción del servidor

Siempre en `src/app.ts` exportando una función `buildApp()`.
El `src/index.ts` solo arranca el servidor:

```typescript
// src/app.ts
import Fastify from 'fastify'
import { logger } from '@allcoba/kernel'

export async function buildApp() {
  const app = Fastify({
    logger,               // Pino ya configurado con redact
    requestIdHeader: 'x-request-id',
    genReqId: () => crypto.randomUUID(),
  })

  await app.register(import('./plugins/helmet.js'))
  await app.register(import('./plugins/cors.js'))
  await app.register(import('./plugins/rate-limit.js'))
  await app.register(import('./infrastructure/http/auth.routes.js'))

  app.setErrorHandler(errorHandler)

  return app
}

// src/index.ts
import { buildApp } from './app.js'

const app = await buildApp()
await app.listen({ port: Number(process.env.PORT ?? 3001), host: '0.0.0.0' })
```

---

## Routes — schema Zod obligatorio

Toda route tiene schema de validación. Sin schema, sin merge:

```typescript
// infrastructure/http/auth.routes.ts
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

const RegisterBodySchema = z.object({
  phone: z.string().min(9).max(15),
  role:  z.enum(['presenter', 'chooser']),
})

const plugin: FastifyPluginAsync = async (app) => {
  app.post('/auth/register', {
    schema: {
      body: zodToJsonSchema(RegisterBodySchema),
    },
  }, async (request, reply) => {
    const body = RegisterBodySchema.parse(request.body)
    await registerUserUseCase.execute(body)
    return reply.status(201).send()
  })
}

export default plugin
```

---

## Declaración de tipos en el request

Extender los tipos de Fastify para los campos que añade el middleware:

```typescript
// src/types.d.ts
declare module 'fastify' {
  interface FastifyRequest {
    tenantId:    string
    userRole:    UserRole
    sessionId:   string
    dekAvailable: boolean
  }
}
```

---

## Error handler — único punto de mapeo

Un solo `setErrorHandler` en `app.ts`. Los use cases lanzan errores de dominio,
el handler los mapea a HTTP. Nunca lanzar errores HTTP desde el dominio:

```typescript
// src/error-handler.ts
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { logger } from '@allcoba/kernel'
import {
  InvalidCredentialsError,
  UserAlreadyExistsError,
  SessionExpiredError,
} from '../domain/errors/auth.errors.js'

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof InvalidCredentialsError) {
    return void reply.status(401).send({ error: { code: 'INVALID_CREDENTIALS' } })
  }
  if (error instanceof UserAlreadyExistsError) {
    return void reply.status(409).send({ error: { code: 'USER_ALREADY_EXISTS' } })
  }
  if (error instanceof SessionExpiredError) {
    return void reply.status(401).send({ error: { code: 'SESSION_EXPIRED' } })
  }
  // Validación de Zod / schema de Fastify
  if (error.statusCode === 400) {
    return void reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: error.message } })
  }
  // Error no esperado — loguear y devolver 500 genérico
  logger.error({ err: error, requestId: request.id }, 'unhandled error')
  return void reply.status(500).send({ error: { code: 'INTERNAL_ERROR' } })
}
```

---

## Hooks de middleware — orden obligatorio

```typescript
// El orden importa — siempre en este orden
app.addHook('onRequest',    helmet)         // 1. cabeceras de seguridad
app.addHook('onRequest',    cors)           // 2. CORS
app.addHook('onRequest',    rateLimiter)    // 3. rate limiting
app.addHook('preHandler',   verifyJWT)      // 4. verificar token (rutas protegidas)
app.addHook('preHandler',   extractContext) // 5. extraer userId, role, etc. de headers
// Handler de la ruta
```

---

## Respuestas HTTP — formato estándar

```typescript
// Éxito con datos
reply.status(200).send({ data: { ...resource } })

// Éxito colección con paginación
reply.status(200).send({
  data: [...items],
  meta: { total, cursor, hasMore },
})

// Creado
reply.status(201).send({ data: { id: newResource.id } })

// Sin contenido
reply.status(204).send()

// Error (siempre desde el error handler, nunca desde la route)
reply.status(4xx).send({ error: { code: 'TYPED_ERROR_CODE' } })
```

---

## Plugins — siempre con fastify-plugin

Los plugins que decoran el request/reply deben usar `fastify-plugin` para
que las decoraciones sean visibles en el scope padre:

```typescript
import fp from 'fastify-plugin'

export default fp(async (app) => {
  app.decorate('someHelper', () => { ... })
}, { name: 'some-helper' })
```
