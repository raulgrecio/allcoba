# CLAUDE.md — apps/api

> Contexto específico del servidor de API REST.
> Lee también el CLAUDE.md raíz del proyecto antes de trabajar aquí.

---

## Qué es este proceso

Servidor HTTP construido con **Fastify + Node.js 22 + TypeScript**. Es el único proceso que expone puertos públicos. Los workers (IA, ETL) son procesos separados que se comunican exclusivamente a través de la cola de jobs en PostgreSQL — nunca por HTTP entre ellos.

---

## Estructura de carpetas

```
apps/api/src/
├── index.ts                  ← entry point: registra plugins y arranca el servidor
├── app.ts                    ← construcción del servidor Fastify (exportable para tests)
├── error-handler.ts          ← mapea errores de dominio a respuestas HTTP
├── plugins/
│   ├── jwt.ts                ← @fastify/jwt con RS256
│   ├── cors.ts               ← @fastify/cors — sólo dominios propios
│   ├── helmet.ts             ← cabeceras de seguridad
│   ├── rate-limit.ts         ← store en PostgreSQL, sin Redis
│   └── sentry.ts             ← error tracking, PII redactado antes de enviar
├── middleware/
│   ├── verify-jwt.ts         ← verifica token, añade request.user
│   ├── tenant-isolation.ts   ← provider_id del JWT SIEMPRE, nunca del body
│   ├── load-dek.ts           ← recupera DEK del sessionStore para el handler
│   └── anomaly-detection.ts  ← alerta en bulk reads anómalos
├── modules/
│   ├── auth/                 ← login, registro, MFA, refresh, logout
│   ├── providers/            ← ficha pública, búsqueda, disponibilidad
│   ├── consumers/            ← perfil, interacciones, trust score público
│   ├── conversations/        ← contacto anónimo, mensajes, reveal identity
│   ├── reviews/              ← calificaciones públicas de providers
│   └── admin/                ← moderación (sólo platform_admin)
└── kernel/                   ← re-exports del package @allcoba/kernel
```

### Estructura interna de cada módulo

```
modules/providers/
├── domain/                   ← entidades y errores (sin imports de infra)
├── application/
│   ├── use-cases/            ← un fichero por use case
│   └── ports/                ← interfaces TypeScript que la infra implementa
├── infrastructure/
│   ├── persistence/          ← adapters de Drizzle
│   ├── http/                 ← routes de Fastify + schemas Zod
│   └── schema/               ← schema de Drizzle para este módulo
└── index.ts                  ← barrel export del módulo
```

---

## Reglas críticas para este proceso

### Seguridad — orden del middleware (NO cambiar)

```
1. helmet          → cabeceras de seguridad
2. cors            → filtro de origen
3. rate-limit      → límite por IP/usuario antes de hacer nada
4. verify-jwt      → cualquier ruta protegida requiere token válido
5. tenant-isolation → el provider_id del JWT es la fuente de verdad
6. load-dek        → sólo en rutas que acceden a datos cifrados
7. handler         → lógica de negocio
```

### El `provider_id` NUNCA viene de la request

```typescript
// ✅ CORRECTO — siempre del JWT verificado
const providerId = request.user.sub;

// ❌ INCORRECTO — nunca de params, body, query
const providerId = request.params.providerId;
const providerId = request.body.providerId;
const providerId = request.query.providerId;
```

### La DEK nunca toca el log ni la respuesta

```typescript
// ✅ CORRECTO
logger.info({ providerId, action: 'customer.read' }, 'customer fetched');

// ❌ INCORRECTO — la DEK aparecería en logs
logger.info({ providerId, dek, action: 'customer.read' }, 'customer fetched');

// ❌ INCORRECTO — la DEK en una respuesta HTTP
return reply.send({ customers, dek });
```

### Errores de dominio → HTTP en un único sitio

```typescript
// apps/api/src/error-handler.ts
// Este es el ÚNICO sitio donde se mapean errores a HTTP
// Los use cases lanzan errores de dominio tipados, nunca errores HTTP

fastify.setErrorHandler((error, request, reply) => {
  if (error instanceof ProviderNotFoundError) {
    return reply.status(404).send({ error: { code: 'PROVIDER_NOT_FOUND' } });
  }
  if (error instanceof TenantViolationError) {
    // 404 deliberado — no revelar que el recurso existe
    return reply.status(404).send({ error: { code: 'NOT_FOUND' } });
  }
  if (error instanceof ValidationError) {
    return reply.status(422).send({ error: { code: 'VALIDATION_ERROR', field: error.field } });
  }
  // Errores no esperados → 500 + Sentry, sin revelar detalles internos
  logger.error(error, 'unhandled error');
  Sentry.captureException(error);
  return reply.status(500).send({ error: { code: 'INTERNAL_ERROR' } });
});
```

---

## Cómo añadir un endpoint nuevo

1. Definir el use case en `modules/<modulo>/application/use-cases/`
2. Definir el port (interfaz) en `modules/<modulo>/application/ports/`
3. Implementar el adapter en `modules/<modulo>/infrastructure/persistence/`
4. Registrar la route en `modules/<modulo>/infrastructure/http/`
5. Añadir schema Zod de validación en la route — sin schema, sin merge
6. Añadir test de tenant isolation si la route accede a datos de un provider
7. Ejecutar `EXPLAIN ANALYZE` en la query nueva antes de mergear

---

## Variables de entorno requeridas

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

DATABASE_URL=postgresql://...
KEY_MGMT_DATABASE_URL=postgresql://...

JWT_PRIVATE_KEY=          # RS256 PEM
JWT_PUBLIC_KEY=           # RS256 PEM
SESSION_SECRET=           # 32 bytes aleatorios

PLATFORM_SALT=            # nunca cambiar en producción
WEB_URL=                  # para CORS
APP_URL=                  # para CORS

SENTRY_DSN=
LOG_LEVEL=info
SERVICE_NAME=api
```

---

## Comandos habituales

```bash
# Desarrollo con hot reload
pnpm dev

# Build de producción
pnpm build

# Tests unitarios (sin IO)
pnpm test:unit

# Tests de integración (levanta PostgreSQL en Docker)
pnpm test:integration

# Tests de seguridad (tenant isolation)
pnpm test:security

# Linting
pnpm lint

# Chequear tipos TypeScript
pnpm typecheck
```

---

## Dependencias directas (las únicas permitidas)

```json
{
  "fastify": "^4",
  "@fastify/jwt": "^8",
  "@fastify/cors": "^9",
  "@fastify/helmet": "^11",
  "@fastify/rate-limit": "^9",
  "drizzle-orm": "^0.30",
  "zod": "^3",
  "argon2": "^0.31",
  "pino": "^8",
  "pg-boss": "^9",
  "@sentry/node": "^7",
  "@allcoba/domain": "workspace:*",
  "@allcoba/kernel": "workspace:*",
  "@allcoba/shared-types": "workspace:*"
}
```

Cualquier dependencia nueva requiere justificación explícita en el PR. El objetivo es mantener el bundle pequeño y las dependencias auditables.
