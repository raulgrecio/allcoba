# 28 · Arquitectura de microservicios

> Microservicios con BD compartida.
> BD compartida: misma instancia PostgreSQL, schemas separados por dominio.
> Cola de jobs: pg-boss en PostgreSQL (migrable a Redis cuando sea necesario).
> Penalización de rendimiento: < 1ms con los tres patrones de mitigación aplicados.

---

## Decisión de arquitectura

**Microservicios con BD compartida** — no microservicios puros (una BD por servicio).

Razones:

- Desarrollo en paralelo con agentes independientes sin coordinación de BD
- Cada servicio puede deployarse y escalarse independientemente
- La BD compartida evita la complejidad de consistencia eventual entre servicios
- Cuando un servicio concreto necesite su propia BD, se migra solo ese servicio

---

## Mapa de servicios

```text
┌─────────────────────────────────────────────────────────┐
│                    INTERNET                              │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS :443
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   API GATEWAY :3000                      │
│  · Verifica JWT localmente (clave pública RS256)        │
│  · Extrae userId, role, sessionId del token             │
│  · Recupera DEK del sessionStore (RAM → Redis futuro)   │
│  · Inyecta headers internos X-User-Id, X-Role, etc.    │
│  · Rate limiting por IP y por usuario                   │
│  · Enruta al servicio correspondiente                   │
└────┬──────┬──────┬──────┬──────┬──────┬──────┬─────────┘
     │      │      │      │      │      │      │
     │ HTTP interno (red privada — no expuesto a internet)
     │      │      │      │      │      │      │
  :3001  :3002  :3003  :3004  :3005  :3006  :3007/:3008
  auth   media  notif  search match  conv   appt/rep
   svc    svc    svc    svc    svc    svc    svc/svc
     │      │      │      │      │      │      │
     └──────┴──────┴──────┴──────┴──────┴──────┘
                          │
              ┌───────────┴────────────┐
              │     PostgreSQL 16      │
              │  Base de datos única   │
              │  schemas por dominio   │
              └────────────────────────┘
                          │
              ┌───────────┴────────────┐
              │  Key Management DB     │
              │  (instancia separada)  │
              │  Solo auth-service     │
              └────────────────────────┘
```

---

## Los tres patrones de mitigación de rendimiento

Sin estos patrones los microservicios añadirían 20-100ms por request.
Con ellos la penalización es < 1ms.

### Patrón 1 — Verificación local del JWT

El auth-service emite JWTs firmados con clave privada RS256.
Cada servicio tiene la clave pública en su variable de entorno.
La verificación es local — cero llamadas HTTP.

```typescript
// packages/kernel/src/auth/jwt-verify.ts
// Usado por el gateway Y por cada servicio interno

import jwt from '@fastify/jwt'

// Cada servicio registra esto con su JWT_PUBLIC_KEY
fastify.register(jwt, {
  secret: { public: process.env.JWT_PUBLIC_KEY },  // solo clave pública
  verify: { algorithms: ['RS256'] },
})

// Verificación local — ~0.1ms, sin red
async function verifyToken(token: string): Promise<JWTPayload> {
  return fastify.jwt.verify<JWTPayload>(token)
}
```

**Cuándo SÍ se llama al auth-service:**

- `POST /auth/register` — crear cuenta
- `POST /auth/login` — obtener tokens
- `POST /auth/refresh` — renovar access token
- `POST /auth/logout` — revocar refresh token
- `POST /auth/mfa/setup` — configurar MFA
- `POST /auth/mfa/verify` — verificar código MFA

**Cuándo NO se llama al auth-service:**

- Todos los demás requests — el JWT se verifica localmente

---

### Patrón 2 — Gateway como única barrera de autenticación

El gateway verifica el token una vez y propaga la identidad.
Los servicios internos confían en los headers del gateway sin re-verificar.

```typescript
// services/api-gateway/src/middleware/auth-propagation.ts

export async function propagateAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // 1. Verificar JWT localmente
  const payload = await verifyTokenLocally(request.headers.authorization)

  // 2. Recuperar DEK del sessionStore (si existe)
  const dekAvailable = sessionStore.has(payload.sessionId)

  // 3. Inyectar headers internos — sobreescribir SIEMPRE
  //    (nunca confiar en headers que vengan del cliente)
  request.headers['x-user-id']      = payload.sub
  request.headers['x-user-role']    = payload.role
  request.headers['x-session-id']   = payload.sessionId
  request.headers['x-vertical']     = payload.verticalId ?? ''
  request.headers['x-request-id']   = request.id
  request.headers['x-dek-available'] = dekAvailable ? 'true' : 'false'

  // Eliminar el header Authorization antes de reenviar internamente
  // Los servicios internos no necesitan el JWT — ya tienen los headers
  delete request.headers['authorization']
}
```

```typescript
// Cómo los servicios internos consumen los headers
// services/matching-service/src/infrastructure/http/context.ts

export function extractUserContext(request: FastifyRequest): UserContext {
  return {
    userId:       request.headers['x-user-id'] as string,
    role:         request.headers['x-user-role'] as UserRole,
    sessionId:    request.headers['x-session-id'] as string,
    vertical:     request.headers['x-vertical'] as string,
    requestId:    request.headers['x-request-id'] as string,
    dekAvailable: request.headers['x-dek-available'] === 'true',
  }
}
```

---

### Patrón 3 — SessionStore centralizado en el gateway

La DEK (clave de cifrado del usuario) vive en el sessionStore del gateway.
Los servicios que necesitan la DEK la piden al gateway vía el header `X-Session-Id`,
no al auth-service.

```typescript
// services/api-gateway/src/session/session-store.ts
// En MVP: Map en memoria. En escala: Redis.

class SessionStore {
  private store = new Map<string, SessionEntry>()

  set(sessionId: string, dek: Uint8Array, ttlMs = 15 * 60 * 1000): void {
    this.store.set(sessionId, {
      dek,
      expiresAt: Date.now() + ttlMs,
    })
  }

  get(sessionId: string): Uint8Array | null {
    const entry = this.store.get(sessionId)
    if (!entry || entry.expiresAt < Date.now()) {
      this.store.delete(sessionId)
      return null
    }
    return entry.dek
  }

  has(sessionId: string): boolean {
    return this.get(sessionId) !== null
  }
}

// Migración futura a Redis — solo cambia este adapter
// El gateway no sabe si usa Map o Redis
export interface SessionStorePort {
  set(sessionId: string, dek: Uint8Array, ttlMs: number): Promise<void>
  get(sessionId: string): Promise<Uint8Array | null>
  has(sessionId: string): Promise<boolean>
  delete(sessionId: string): Promise<void>
}
```

---

## Comunicación entre servicios

### HTTP síncrono — solo para respuestas inmediatas

```typescript
// packages/kernel/src/http/internal-client.ts
// Cliente HTTP para llamadas entre servicios internos

export class InternalHttpClient {
  constructor(
    private readonly baseUrl: string,
    private readonly serviceName: string,
  ) {}

  async get<T>(path: string, context: UserContext): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        'x-user-id':    context.userId,
        'x-user-role':  context.role,
        'x-session-id': context.sessionId,
        'x-request-id': context.requestId,
        'x-internal':   'true',  // marca la llamada como interna
      },
    })
    if (!response.ok) throw new InternalServiceError(this.serviceName, response.status)
    return response.json()
  }
}
```

**Llamadas síncronas permitidas entre servicios:**

```text
gateway → auth-service:       login, registro, refresh, logout
gateway → search-service:     GET /search (Chooser busca Presenters)
gateway → matching-service:   GET /deck (Chooser pide su deck)
gateway → conversation-service: GET /conversations, POST /messages
```

### Cola asíncrona — para todo lo demás

```typescript
// Cualquier servicio publica jobs — cualquier servicio los consume
// El publisher no espera la respuesta

// Ejemplos de jobs cross-service:
const JOBS = {
  // gateway → media-service
  'moderate-image':           { imageId, userId, vertical, tempR2Path },

  // gateway → notification-service
  'send-notification':        { type, recipientId, data },

  // matching-service → notification-service
  'notify-match':             { matchId, presenterId, chooserHash },

  // appointment-service → notification-service
  'appointment-reminder':     { appointmentId, startsAt },

  // reputation-service → matching-service (actualizar deck)
  'score-updated':            { userHash, newScore },

  // scraper-service → media-service
  'moderate-scraped-image':   { imageUrl, providerId, vertical },
}
```

---

## Schemas de BD por servicio

Todos en la misma instancia PostgreSQL, schemas separados:

```sql
-- Cada servicio solo lee/escribe en su schema + shared
CREATE SCHEMA auth;         -- auth-service
CREATE SCHEMA media;        -- media-service
CREATE SCHEMA notifications; -- notification-service
CREATE SCHEMA search;       -- search-service (vistas materializadas)
CREATE SCHEMA matching;     -- matching-service
CREATE SCHEMA conversations; -- conversation-service
CREATE SCHEMA appointments;  -- appointment-service
CREATE SCHEMA reputation;   -- reputation-service
CREATE SCHEMA scraper;      -- scraper-service

CREATE SCHEMA shared;       -- tablas que leen múltiples servicios (solo lectura para la mayoría)
-- shared.users, shared.verticals, shared.providers_public, shared.trust_scores
```

**Regla de acceso:**

- Cada servicio tiene credenciales de BD con permisos solo en su schema + lectura en `shared`
- Ningún servicio escribe en el schema de otro
- La consistencia entre schemas se mantiene via eventos en la cola, no via foreign keys entre schemas

---

## Docker Compose local

```yaml
# infra/docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgis/postgis:16-3.4-alpine
    ports: ['5432:5432']
    environment:
      POSTGRES_DB: allcoba
      POSTGRES_USER: allcoba
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infra/init.sql:/docker-entrypoint-initdb.d/init.sql

  postgres_keys:
    image: postgres:16-alpine
    ports: ['5433:5432']
    environment:
      POSTGRES_DB: allcoba_keys
      POSTGRES_USER: keyservice
      POSTGRES_PASSWORD: ${KEY_DB_PASSWORD}
    volumes:
      - keys_data:/var/lib/postgresql/data

  api-gateway:
    build: ./services/api-gateway
    ports: ['3000:3000']
    environment:
      JWT_PUBLIC_KEY: ${JWT_PUBLIC_KEY}
      PLATFORM_SALT: ${PLATFORM_SALT}
      # URLs de servicios internos
      AUTH_SERVICE_URL: http://auth-service:3001
      SEARCH_SERVICE_URL: http://search-service:3004
      MATCHING_SERVICE_URL: http://matching-service:3005
      CONVERSATION_SERVICE_URL: http://conversation-service:3006
    depends_on: [auth-service, search-service, matching-service]

  auth-service:
    build: ./services/auth-service
    ports: ['3001:3001']
    environment:
      DATABASE_URL: postgresql://allcoba:${DB_PASSWORD}@postgres:5432/allcoba
      KEY_MGMT_DATABASE_URL: postgresql://keyservice:${KEY_DB_PASSWORD}@postgres_keys:5432/allcoba_keys
      JWT_PRIVATE_KEY: ${JWT_PRIVATE_KEY}
      JWT_PUBLIC_KEY: ${JWT_PUBLIC_KEY}
    depends_on: [postgres, postgres_keys]

  media-service:
    build: ./services/media-service
    ports: ['3002:3002']
    environment:
      DATABASE_URL: postgresql://allcoba:${DB_PASSWORD}@postgres:5432/allcoba
      R2_ACCOUNT_ID: ${R2_ACCOUNT_ID}
      R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID}
      R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY}
    volumes:
      - ./services/media-service/models:/app/models
    depends_on: [postgres]

  notification-service:
    build: ./services/notification-service
    ports: ['3003:3003']
    environment:
      DATABASE_URL: postgresql://allcoba:${DB_PASSWORD}@postgres:5432/allcoba
    depends_on: [postgres]

  search-service:
    build: ./services/search-service
    ports: ['3004:3004']
    environment:
      DATABASE_URL: postgresql://allcoba:${DB_PASSWORD}@postgres:5432/allcoba
    depends_on: [postgres]

  matching-service:
    build: ./services/matching-service
    ports: ['3005:3005']
    environment:
      DATABASE_URL: postgresql://allcoba:${DB_PASSWORD}@postgres:5432/allcoba
    depends_on: [postgres]

  conversation-service:
    build: ./services/conversation-service
    ports: ['3006:3006']
    environment:
      DATABASE_URL: postgresql://allcoba:${DB_PASSWORD}@postgres:5432/allcoba
    depends_on: [postgres]

  appointment-service:
    build: ./services/appointment-service
    ports: ['3007:3007']
    environment:
      DATABASE_URL: postgresql://allcoba:${DB_PASSWORD}@postgres:5432/allcoba
    depends_on: [postgres]

  reputation-service:
    build: ./services/reputation-service
    ports: ['3008:3008']
    environment:
      DATABASE_URL: postgresql://allcoba:${DB_PASSWORD}@postgres:5432/allcoba
    depends_on: [postgres]

  scraper-service:
    build: ./services/scraper-service
    ports: ['3009:3009']
    environment:
      DATABASE_URL: postgresql://allcoba:${DB_PASSWORD}@postgres:5432/allcoba
    depends_on: [postgres]

volumes:
  postgres_data:
  keys_data:
```

---

## Evolución futura

### Fase 2 — Cuando un servicio necesita escalar independientemente

```bash
# Escalar solo el search-service a 3 instancias
docker compose up --scale search-service=3

# El gateway hace round-robin automáticamente
# No hay cambios en el código
```

### Fase 3 — Extraer un servicio a su propia BD

```text
Ejemplo: search-service migra a Typesense

1. Añadir adapter Typesense que implementa SearchPort
2. Cambiar la variable de entorno SEARCH_ADAPTER=typesense
3. El resto del código no cambia
4. La BD de PostgreSQL pierde el schema 'search'
```

### Fase 4 — Cola migra a Redis/BullMQ

```typescript
// Solo cambia el adapter en packages/kernel/src/queue/
// De PgBossAdapter a BullMQAdapter
// Todos los servicios que publican/consumen jobs: sin cambios
```

---

## Trazabilidad entre servicios

Cada request tiene un `X-Request-Id` que se propaga por todos los servicios.
Todos los logs incluyen este ID — permite reconstruir el flujo completo de un request
aunque haya pasado por 3 servicios distintos.

```typescript
// packages/kernel/src/logger/index.ts
// El requestLogger recibe el requestId y lo añade a todos los logs del request

export function requestLogger(requestId: string, userId?: string) {
  return logger.child({
    requestId,
    userId,
    // No incluir DEK, sessionId ni ningún dato sensible aquí
  })
}
```

```text
Ejemplo de logs trazados:
  gateway         requestId=abc123 → enrutando a matching-service
  matching-service requestId=abc123 → generando deck para userId=xxx
  matching-service requestId=abc123 → publicando job generate-embedding
  search-service  requestId=abc123 → consultando providers en radio 5km
  gateway         requestId=abc123 → response 200 en 18ms
```
