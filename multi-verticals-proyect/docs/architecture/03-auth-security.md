# 03 · Autenticación y seguridad

> Stack: **Fastify** + **@fastify/jwt** + **Argon2id** + **TOTP nativo**
> Sin Auth0. Sin Clerk. Sin Firebase Auth. Sin licencias.

---

## Roles del sistema

| Rol | Descripción |
|-----|-------------|
| `consumer` | Comprador/cliente. Perfil anónimo por defecto |
| `provider` | Vendedor/negocio. Tiene DEK y schema propio |
| `agency_admin` | Gestiona un grupo de providers |
| `platform_admin` | Nosotros. Acceso de moderación, nunca a datos cifrados de clientes |

---

## JWT — configuración

- **Algoritmo**: RS256 (clave asimétrica — la clave privada sólo está en el servidor)
- **TTL access token**: 15 minutos
- **TTL refresh token**: 7 días, rotación en cada uso
- **Refresh token**: almacenado en cookie `httpOnly; Secure; SameSite=Strict`
- **Access token**: en memoria del cliente (nunca en localStorage)

```typescript
// apps/api/src/plugins/jwt.ts
import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'

export default fp(async (fastify) => {
  fastify.register(jwt, {
    secret: {
      private: process.env.JWT_PRIVATE_KEY,  // RS256
      public:  process.env.JWT_PUBLIC_KEY,
    },
    sign: { algorithm: 'RS256', expiresIn: '15m' },
    verify: { algorithms: ['RS256'] },
  })
})

// Payload del JWT — mínimo, sin PII
interface JWTPayload {
  sub: string         // provider_id o consumer_id
  role: UserRole
  sessionId: string   // referencia al sessionStore (donde vive la DEK)
  verticalId?: string // si el token es scoped a una vertical
  iat: number
  exp: number
}
```

---

## MFA obligatorio para providers

Los providers deben activar MFA antes de poder publicar listings. Se usa TOTP (RFC 6238) — compatible con cualquier app autenticadora (Authy, Google Authenticator, Aegis…) sin dependencia de terceros.

```typescript
// packages/kernel/src/auth/totp.ts
import { createHmac, randomBytes } from 'node:crypto'

// Generar secret para el provider (se muestra como QR en el setup)
export function generateTOTPSecret(): string {
  return randomBytes(20).toString('base32')
}

// Verificar código de 6 dígitos (ventana de ±1 intervalo de 30s)
export function verifyTOTP(secret: string, token: string): boolean {
  const now = Math.floor(Date.now() / 30000)
  for (const counter of [now - 1, now, now + 1]) {
    if (generateTOTPToken(secret, counter) === token) return true
  }
  return false
}

function generateTOTPToken(secret: string, counter: number): string {
  const key = Buffer.from(secret, 'base32')
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const hmac = createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const code = ((hmac[offset] & 0x7f) << 24
    | hmac[offset + 1] << 16
    | hmac[offset + 2] << 8
    | hmac[offset + 3]) % 1_000_000
  return code.toString().padStart(6, '0')
}
```

---

## Flujo de autenticación completo

```
POST /auth/login
  │
  ├── Verificar password con Argon2id
  ├── Si MFA activo: exigir código TOTP
  ├── Descifrar DEK → guardar en sessionStore (TTL 15 min)
  ├── Emitir access token (JWT, 15 min)
  └── Emitir refresh token (opaque, cookie httpOnly, 7 días)

GET /api/protected-route
  │
  ├── Middleware verifyJWT → extrae payload
  ├── Middleware enforceTenantIsolation → valida provider_id
  ├── Middleware loadDEK → recupera DEK del sessionStore por sessionId
  └── Handler → tiene acceso a request.dek

POST /auth/refresh
  │
  ├── Leer refresh token de cookie httpOnly
  ├── Verificar en DB (tokens rotativos — el anterior se invalida)
  ├── Re-emitir access token nuevo
  └── Re-emitir refresh token nuevo (rotación)

POST /auth/logout
  │
  ├── Invalidar refresh token en DB
  ├── Eliminar DEK del sessionStore
  └── Borrar cookie
```

---

## Middleware de seguridad (cadena de Fastify hooks)

```typescript
// apps/api/src/middleware/security-chain.ts

// 1. Rate limiting por IP y por usuario
fastify.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: '1 minute',
  // Store en PostgreSQL — sin Redis
  store: new PostgresRateLimitStore(db),
  keyGenerator: (request) =>
    request.user?.sub ?? request.ip,
})

// 2. Verificación JWT en rutas protegidas
fastify.addHook('preHandler', async (request, reply) => {
  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send({ error: 'unauthorized' })
  }
})

// 3. Tenant isolation — provider_id del JWT nunca del body
fastify.addHook('preHandler', enforceTenantIsolation)

// 4. Cargar DEK en request para handlers que la necesiten
fastify.addHook('preHandler', loadDEKFromSession)
```

```typescript
// apps/api/src/middleware/tenant-isolation.ts
export async function enforceTenantIsolation(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const providerIdFromToken = request.user.sub
  const providerIdFromParam = (request.params as any).providerId

  if (providerIdFromParam && providerIdFromParam !== providerIdFromToken) {
    // 404 deliberado — no revelar que el recurso existe
    return reply.status(404).send({ error: 'not_found' })
  }
}
```

---

## Hashing de passwords

```typescript
// packages/kernel/src/auth/password.ts
import argon2 from 'argon2'

// Configuración Argon2id — OWASP 2024
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,  // 64 MB
  timeCost: 3,
  parallelism: 4,
}

export const hashPassword   = (pwd: string) => argon2.hash(pwd, ARGON2_OPTIONS)
export const verifyPassword = (hash: string, pwd: string) => argon2.verify(hash, pwd)
```

---

## Protecciones HTTP

```typescript
// apps/api/src/plugins/security.ts
import helmet from '@fastify/helmet'
import cors   from '@fastify/cors'

// Helmet — cabeceras de seguridad
fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      imgSrc:     ["'self'", 'data:', '*.r2.cloudflarestorage.com'],
    }
  }
})

// CORS — sólo dominios propios
fastify.register(cors, {
  origin: [process.env.WEB_URL, process.env.APP_URL],
  credentials: true,  // necesario para cookies httpOnly
})
```

---

## Detección de anomalías básica

```typescript
// apps/api/src/middleware/anomaly-detection.ts

// Alerta si un provider descarga más de 50 registros de clientes en 5 minutos
// (posible exfiltración de datos)
const BULK_READ_THRESHOLD = 50
const WINDOW_MS = 5 * 60 * 1000

export async function detectBulkRead(
  providerId: string,
  recordCount: number
): Promise<void> {
  const key = `bulk_read:${providerId}`
  const current = readCounter.increment(key, recordCount, WINDOW_MS)
  if (current > BULK_READ_THRESHOLD) {
    logger.warn({ providerId, count: current }, 'anomaly.bulk_read_detected')
    // TODO: notificar a platform_admin y requerir re-autenticación
  }
}
```

---

## Variables de entorno requeridas

```env
# JWT
JWT_PRIVATE_KEY=      # RS256 private key (PEM)
JWT_PUBLIC_KEY=       # RS256 public key (PEM)

# Sesiones
SESSION_SECRET=       # 32 bytes aleatorios para firmar cookies

# Base de datos
DATABASE_URL=         # postgresql://user:pass@host:5432/marketplace
KEY_MGMT_DATABASE_URL=# postgresql://user:pass@host:5432/keymanagement

# Plataforma
PLATFORM_SALT=        # sal para consumer_hash (nunca cambiar en producción)
```

Nunca en el repositorio. Siempre en `.env.local` (desarrollo) o en el gestor de secretos del CI.
