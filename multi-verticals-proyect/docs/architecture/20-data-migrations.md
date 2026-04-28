# 20 · Migraciones de datos

> Stack: **Drizzle Kit** (migraciones SQL versionadas)
> Sin Prisma Migrate. Sin Liquibase. Sin herramientas con licencia.
> Las migraciones son SQL puro generado por Drizzle — siempre legible y auditable.

---

## Principios

1. **Una migración es inmutable** — nunca se edita un fichero de migración ya aplicado en ningún entorno. Si hay un error, se crea una migración nueva que lo corrige.
2. **Siempre hacia adelante** — las migraciones son aditivas. Las columnas se eliminan en dos pasos: primero se deprecan (se deja de usar en código), luego se eliminan en una migración posterior.
3. **Migraciones atómicas** — cada migración es una transacción. Si falla, se hace rollback completo.
4. **Sin datos en migraciones** — los datos de seed van en scripts separados en `infra/seeds/`.
5. **Sin downtime** — las migraciones deben poder aplicarse con la app en producción (expand/contract pattern).

---

## Estructura de ficheros

```text
infra/
  migrations/
    0001_create_extensions.sql
    0002_create_verticals.sql
    0003_create_agencies.sql
    0004_create_providers.sql
    0005_create_trust_signals.sql
    0006_create_media_assets.sql
    0007_create_job_queue.sql       ← pg-boss crea sus tablas, pero documentamos aquí
    0008_add_provider_search_vector.sql
    0009_add_provider_scores.sql
    ...
    NNNN_descripcion_clara.sql     ← siempre nombre descriptivo, nunca solo el número
  seeds/
    01_verticals.ts                ← datos de configuración de verticales
    02_test_providers.ts           ← datos de prueba (sólo desarrollo)
  schema/
    ← generado por Drizzle Kit — no editar manualmente
```

---

## Flujo de trabajo para añadir una migración

```bash
# 1. Modificar el schema de Drizzle en el módulo correspondiente
# apps/api/src/modules/hairdresser/infrastructure/schema/hairdresser.schema.ts

# 2. Generar el SQL de migración (Drizzle compara el schema actual con la BD)
npx drizzle-kit generate --name="add_provider_specialization"

# 3. Revisar el SQL generado en infra/migrations/ antes de aplicar
# SIEMPRE revisar — el SQL generado es auditable

# 4. Aplicar en desarrollo
npx drizzle-kit migrate

# 5. Aplicar en CI/staging automáticamente (ver pipeline en 18-testing-strategy.md)

# 6. Aplicar en producción — SIEMPRE con backup previo
pnpm backup:prod && pnpm migrate:prod
```

---

## Expand/contract pattern (migraciones sin downtime)

Para cambios destructivos (renombrar columna, cambiar tipo) se sigue este patrón de tres fases:

```text
Fase 1 — Expand (migración + deploy)
  Añadir la columna nueva manteniendo la antigua
  El código escribe en ambas columnas

Fase 2 — Migrate data (script de backfill)
  Copiar datos de columna antigua a nueva
  Verificar que todos los registros están migrados

Fase 3 — Contract (migración + deploy)
  El código sólo usa la columna nueva
  Eliminar la columna antigua
```

```sql
-- Ejemplo: renombrar 'bio' a 'description' sin downtime

-- FASE 1: Expand
ALTER TABLE providers ADD COLUMN description TEXT;
-- El código ahora escribe en bio Y en description

-- FASE 2: Backfill (script separado, no migración)
UPDATE providers SET description = bio WHERE description IS NULL;

-- FASE 3: Contract (semana después, tras verificar)
ALTER TABLE providers DROP COLUMN bio;
-- El código ya sólo usa description
```

---

## Migraciones de schemas de provider

Cuando se añade una columna a las tablas de clientes de los providers, hay que aplicarla en todos los schemas existentes. Esto requiere un script especial:

```typescript
// infra/migrations/scripts/migrate-all-provider-schemas.ts

async function migrateAllProviderSchemas(db: Database, migration: string): Promise<void> {
  const providers = await db.select({ id: providers.id }).from(providers)

  for (const provider of providers) {
    const schemaName = `provider_${provider.id.replace(/-/g, '_')}`

    try {
      await db.execute(sql.raw(
        migration.replace('__SCHEMA__', schemaName)
      ))
      logger.info({ providerId: provider.id }, 'schema.migrated')
    } catch (err) {
      logger.error({ providerId: provider.id, err }, 'schema.migration.failed')
      // No detener — continuar con el siguiente provider
      // Los providers con error se listan al final para revisión manual
    }
  }
}

// Uso:
await migrateAllProviderSchemas(db, `
  ALTER TABLE __SCHEMA__.customers
  ADD COLUMN IF NOT EXISTS preferred_channel TEXT;
`)
```

---

## Seeds por entorno

```typescript
// infra/seeds/01_verticals.ts
// Ejecutar: npx tsx infra/seeds/01_verticals.ts

import { VERTICALS } from './data/verticals'  // datos del doc 10-vertical-system.md

async function seedVerticals() {
  for (const vertical of VERTICALS) {
    await db.insert(verticalsTable)
      .values({
        slug: vertical.slug,
        name: vertical.name,
        config: vertical,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: verticalsTable.slug,
        set: { config: vertical, name: vertical.name },  // actualiza config si ya existe
      })
  }
  logger.info(`Seeded ${VERTICALS.length} verticals`)
}

seedVerticals().catch(console.error)
```

```typescript
// infra/seeds/02_test_providers.ts
// SÓLO para desarrollo y staging — nunca en producción
// Guarda en DB: SEED_ENV != 'production' como guard

if (process.env.NODE_ENV === 'production') {
  throw new Error('NUNCA ejecutar seeds de test en producción')
}

// Genera 20 providers de prueba con datos realistas
// distribuidos por Madrid, con disponibilidad y servicios de ejemplo
```

---

## Rollback de emergencia

Si una migración rompe producción y no hay tiempo para un fix hacia adelante:

```bash
# 1. Restaurar el backup inmediatamente anterior
pnpm restore:prod --backup=marketplace_20240115_020000.dump.enc

# 2. Desplegar la versión anterior de la aplicación
git revert HEAD && git push

# 3. Investigar en un entorno de staging replicado con los datos reales
# (los datos de clientes están cifrados — incluso en el backup son seguros)
```

Drizzle no tiene rollback automático de migraciones porque las migraciones son SQL real. El rollback se hace restaurando el backup de BD, no ejecutando SQL inverso.

---

## Tabla de control de migraciones

Drizzle Kit gestiona automáticamente la tabla `__drizzle_migrations` que registra qué migraciones se han aplicado. No modificar manualmente.

```sql
-- Lo que gestiona Drizzle internamente (no tocar)
CREATE TABLE IF NOT EXISTS __drizzle_migrations (
  id SERIAL PRIMARY KEY,
  hash TEXT NOT NULL,
  created_at BIGINT
);
```
