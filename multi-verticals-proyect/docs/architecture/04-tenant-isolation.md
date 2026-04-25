# 04 · Aislamiento entre tenants (providers)

> Stack: **PostgreSQL schemas** + **Row-Level Security** + **Fastify middleware**
> Tres barreras independientes. Si una falla, las otras dos contienen el daño.

---

## Principio

Los datos de los clientes de cada provider son **de ese provider y sólo de ese provider**. La plataforma actúa como custodio técnico, no como propietaria de esos datos. Esto tiene implicaciones legales (RGPD) y de diseño: si un provider se va, puede llevarse sus datos.

Tres barreras en capas:

```
Request HTTP
    │
    ▼
[Barrera 1] Middleware Fastify — provider_id del JWT, nunca del body
    │
    ▼
[Barrera 2] PostgreSQL Row-Level Security — la BD rechaza queries cross-tenant
    │
    ▼
[Barrera 3] Schema separado por provider — aislamiento físico de tablas
```

---

## Barrera 1: Middleware de aplicación

```typescript
// apps/api/src/middleware/tenant-isolation.ts

declare module 'fastify' {
  interface FastifyRequest {
    tenantId: string  // siempre viene del JWT verificado
  }
}

export async function enforceTenantIsolation(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // El tenantId SIEMPRE viene del JWT — nunca de params, body o query
  const tenantId = request.user.sub

  if (!tenantId) {
    return reply.status(401).send({ error: 'unauthorized' })
  }

  request.tenantId = tenantId

  // Si la ruta tiene :providerId, debe coincidir con el JWT
  const routeProviderId = (request.params as Record<string, string>).providerId
  if (routeProviderId && routeProviderId !== tenantId) {
    // 404 deliberado — no revelar existencia del recurso
    return reply.status(404).send({ error: 'not_found' })
  }
}

// Para rutas de platform_admin que SÍ pueden acceder a cualquier provider
export async function requirePlatformAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (request.user.role !== 'platform_admin') {
    return reply.status(403).send({ error: 'forbidden' })
  }
  // platform_admin nunca recibe DEK — no puede descifrar datos de clientes
}
```

---

## Barrera 2: PostgreSQL Row-Level Security

```sql
-- Habilitar RLS en todas las tablas con datos de provider
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

-- Policy: cada provider sólo ve sus propios datos
-- El app server establece current_setting antes de ejecutar queries
CREATE POLICY provider_isolation ON providers
  USING (id = current_setting('app.current_tenant_id')::UUID);

-- Para platform_admin (rol de BD separado sin RLS)
CREATE ROLE platform_reader;
ALTER TABLE providers FORCE ROW LEVEL SECURITY;
-- platform_reader tiene BYPASS RLS sólo para tablas globales, nunca para schemas de provider
```

```typescript
// packages/kernel/src/db/tenant-context.ts

// Establece el contexto de tenant en PostgreSQL antes de cada query
export async function withTenantContext<T>(
  db: DatabaseConnection,
  tenantId: string,
  fn: () => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    // Establece la variable de sesión que usa la RLS policy
    await tx.execute(
      sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`
    )
    return fn()
  })
}

// Uso en un adapter
async function getCustomers(tenantId: string, dek: Uint8Array) {
  return withTenantContext(db, tenantId, async () => {
    // Si alguien inyecta un tenantId distinto en la query,
    // PostgreSQL lo rechaza por RLS
    const rows = await db.select().from(customers)
    return rows.map(row => decryptCustomer(row, dek))
  })
}
```

---

## Barrera 3: Schema separado por provider

Cada provider tiene un schema de PostgreSQL dedicado: `provider_{uuid}`. Las tablas de clientes y conversaciones sólo existen dentro de ese schema. Un bug en el ORM que genere una query cross-tenant en las tablas globales no puede acceder a datos de clientes porque están en schemas diferentes.

```typescript
// packages/kernel/src/db/schema-manager.ts

export async function createProviderSchema(
  db: DatabaseConnection,
  providerId: string
): Promise<void> {
  const schemaName = `provider_${providerId.replace(/-/g, '_')}`

  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(schemaName)}`)

  // Crear tablas dentro del schema del provider
  await db.execute(sql`
    CREATE TABLE ${sql.identifier(schemaName)}.customers (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      consumer_hash TEXT NOT NULL UNIQUE,
      name_enc      BYTEA,
      phone_enc     BYTEA,
      email_enc     BYTEA,
      notes_enc     BYTEA,
      tags          JSONB DEFAULT '{}',
      created_at    TIMESTAMPTZ DEFAULT now(),
      updated_at    TIMESTAMPTZ DEFAULT now()
    )
  `)

  await db.execute(sql`
    CREATE TABLE ${sql.identifier(schemaName)}.conversations (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id  UUID NOT NULL
                   REFERENCES ${sql.identifier(schemaName)}.customers(id),
      content_enc  BYTEA NOT NULL,
      status       TEXT DEFAULT 'active',
      created_at   TIMESTAMPTZ DEFAULT now(),
      updated_at   TIMESTAMPTZ DEFAULT now()
    )
  `)
}
```

---

## Trust signals: compartir sin revelar

Los trust signals permiten a providers ver indicadores de un consumer sin revelar datos personales ni el historial específico con otros providers.

```typescript
// packages/kernel/src/trust/consumer-hash.ts

// El consumer_hash es un identificador opaco:
// - Permite cruzar datos de un mismo consumer entre providers
// - No permite conocer quién es ese consumer
// - No permite saber con qué providers ha interactuado
export function computeConsumerHash(consumerId: string, platformSalt: string): string {
  return createHash('sha256')
    .update(consumerId + platformSalt)
    .digest('hex')
}

// Lo que un provider puede ver de un consumer (nunca PII)
interface PublicConsumerSignals {
  consumerHash: string          // identificador opaco
  punctualityScore: number      // 0-5, agregado de todos los providers
  paymentScore: number
  communicationScore: number
  totalInteractions: number     // cuántas veces ha interactuado en la plataforma
  isVerified: boolean           // ha verificado su identidad (sin revelarla)
}
```

---

## Tests de tenant isolation (obligatorios)

Estos tests deben existir y pasar antes de cualquier merge que toque queries de datos de clientes.

```typescript
// apps/api/src/tests/tenant-isolation.test.ts

describe('Tenant Isolation', () => {
  it('provider A no puede leer customers de provider B', async () => {
    const tokenA = await loginAsProvider(providerA.id)
    const response = await app.inject({
      method: 'GET',
      url: `/api/providers/${providerB.id}/customers`,
      headers: { authorization: `Bearer ${tokenA}` },
    })
    expect(response.statusCode).toBe(404)  // no 403 — no revelar existencia
  })

  it('provider_id del body no sobreescribe el del JWT', async () => {
    const tokenA = await loginAsProvider(providerA.id)
    const response = await app.inject({
      method: 'GET',
      url: '/api/customers',
      headers: { authorization: `Bearer ${tokenA}` },
      query: { providerId: providerB.id },  // intento de IDOR
    })
    // Sólo devuelve customers de providerA (del JWT), ignora el query param
    const customers = response.json()
    expect(customers.every((c: any) => c.providerId === providerA.id)).toBe(true)
  })

  it('RLS en PostgreSQL bloquea query directa cross-tenant', async () => {
    // Simula un bug en el ORM que no pasa tenantId correcto
    await expect(
      withTenantContext(db, providerA.id, () =>
        db.select().from(customersB)  // tabla del schema de providerB
      )
    ).rejects.toThrow()
  })
})
```
