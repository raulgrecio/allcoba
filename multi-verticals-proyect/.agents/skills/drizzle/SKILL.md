# Skill: Drizzle ORM

Convenciones para definir schemas, escribir queries y gestionar migrations.
Todos los servicios usan Drizzle ORM + PostgreSQL.

---

## Schema — convenciones de definición

```typescript
// infrastructure/schema/auth.schema.ts
import { pgSchema, uuid, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core'

// Cada servicio tiene su propio schema de PostgreSQL
export const authSchema = pgSchema('auth')

export const users = authSchema.table('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  phoneHash:    text('phone_hash').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role:         text('role', { enum: ['presenter', 'chooser', 'platform_admin'] }).notNull(),
  status:       text('status', { enum: ['pending_verification', 'active', 'suspended', 'deleted'] })
                  .notNull()
                  .default('pending_verification'),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Tipos inferidos — siempre exportar para usar en adapters
export type UserRow    = typeof users.$inferSelect
export type NewUserRow = typeof users.$inferInsert
```

---

## Convenciones de nombrado en schema

```
Tabla en BD:     snake_case        users, refresh_tokens, device_fingerprints
Variable en TS:  camelCase         users, refreshTokens, deviceFingerprints
Columna en BD:   snake_case        phone_hash, created_at, is_active
Propiedad en TS: camelCase         phoneHash, createdAt, isActive
```

---

## Queries — siempre parametrizadas

Nunca interpolación de strings en queries. Drizzle lo hace seguro por defecto,
pero hay que tener cuidado con `sql` tagged templates:

```typescript
// ✅ CORRECTO — Drizzle gestiona la parametrización
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
})

// ✅ CORRECTO — sql tag con parámetros
await db.execute(sql`
  SELECT set_config('app.current_tenant_id', ${tenantId}, true)
`)

// ❌ INCORRECTO — interpolación directa (SQL injection)
await db.execute(sql`
  SELECT * FROM users WHERE id = '${userId}'
`)
```

---

## Transacciones

Para operaciones atómicas (publicar job + guardar dato en la misma transacción):

```typescript
await db.transaction(async (tx) => {
  // 1. Guardar el dato
  await tx.insert(appointments).values(appointmentData)

  // 2. Publicar job en la misma transacción (outbox pattern)
  // Si falla cualquier cosa, se hace rollback de ambas operaciones
  await tx.insert(jobQueue).values({
    name:    'send-notification',
    payload: JSON.stringify(notificationData),
  })
})
```

---

## Paginación — siempre cursor-based, nunca OFFSET

```typescript
// ✅ CORRECTO — keyset pagination
async function findProviders(cursor?: string, limit = 20) {
  const where = cursor
    ? lt(providers.createdAt, decodeCursor(cursor))
    : undefined

  const rows = await db.query.providers.findMany({
    where,
    orderBy: desc(providers.createdAt),
    limit:   limit + 1,  // uno más para saber si hay siguiente página
  })

  const hasMore = rows.length > limit
  const items   = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? encodeCursor(items.at(-1)!.createdAt) : null

  return { items, nextCursor, hasMore }
}

// ❌ INCORRECTO — OFFSET escala muy mal
const rows = await db.select().from(providers).limit(20).offset(page * 20)
```

---

## EXPLAIN ANALYZE — obligatorio para queries nuevas

Antes de mergear cualquier query nueva en producción, verificar el plan de ejecución:

```typescript
// En desarrollo o en test de integración
const plan = await db.execute(sql`
  EXPLAIN ANALYZE
  SELECT * FROM auth.users WHERE phone_hash = ${phoneHash}
`)
// Si aparece "Seq Scan" en una tabla grande → falta un índice
// Si aparece "Index Scan" → correcto
```

---

## Migrations — Drizzle Kit

```bash
# Generar migration desde cambios en el schema
npx drizzle-kit generate --name="add_mfa_secrets_table"

# Aplicar migrations en desarrollo
npx drizzle-kit migrate

# Nunca editar un fichero de migration ya aplicado
# Si hay un error → crear una nueva migration que lo corrija
```
