# Skill: Testing

Convenciones para escribir tests en Allcoba.
Stack: Vitest + Testcontainers + Supertest.

---

## Pirámide de tests

```
Unit (muchos, rápidos)
  → domain/ y application/
  → sin IO, sin BD, sin red
  → fakes in-memory — nunca mocks de Vitest para dependencias de dominio

Integration (medios, lentos)
  → infrastructure/ (adapters de Drizzle, routes de Fastify)
  → PostgreSQL real con Testcontainers
  → nunca mocks de BD

Security (pocos, críticos)
  → tenant isolation — un servicio no puede leer datos de otro usuario
  → DEK nunca en logs
  → headers internos sobreescritos por el gateway
```

---

## Tests unitarios — estructura

```typescript
// tests/unit/use-cases/register-user.test.ts

import { describe, it, expect, beforeEach } from 'vitest'
import { RegisterUserUseCase }  from '../../../src/application/use-cases/register-user.use-case.js'
import { FakeUserRepository }   from '../../fakes/user-repository.fake.js'
import { FakeQueue }            from '../../fakes/queue.fake.js'

describe('RegisterUserUseCase', () => {
  let userRepo: FakeUserRepository
  let queue:    FakeQueue
  let useCase:  RegisterUserUseCase

  beforeEach(() => {
    userRepo = new FakeUserRepository()
    queue    = new FakeQueue()
    useCase  = new RegisterUserUseCase(userRepo, queue)
  })

  it('crea un usuario y publica job de OTP', async () => {
    await useCase.execute({ phone: '612345678', role: 'chooser' })

    expect(userRepo.all()).toHaveLength(1)
    expect(queue.jobs).toHaveLength(1)
    expect(queue.jobs[0]!.name).toBe('send-notification')
  })

  it('lanza UserAlreadyExistsError si el teléfono ya está registrado', async () => {
    await useCase.execute({ phone: '612345678', role: 'chooser' })

    await expect(
      useCase.execute({ phone: '612345678', role: 'presenter' })
    ).rejects.toThrow(UserAlreadyExistsError)
  })
})
```

---

## Tests de integración — Testcontainers

```typescript
// tests/integration/setup.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { drizzle }             from 'drizzle-orm/node-postgres'
import { migrate }             from 'drizzle-orm/node-postgres/migrator'

let container: StartedPostgreSqlContainer

export async function setupTestDatabase() {
  container = await new PostgreSqlContainer('postgis/postgis:16-3.4-alpine')
    .withDatabase('allcoba_test')
    .start()

  const db = drizzle(container.getConnectionUri())
  await migrate(db, { migrationsFolder: '../../infra/migrations' })

  // Instalar extensiones
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`)
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`)

  return { db, uri: container.getConnectionUri() }
}

export async function teardown() { await container.stop() }
export async function cleanDb(db: Database) {
  await db.execute(sql`TRUNCATE auth.users CASCADE`)
}
```

```typescript
// tests/integration/persistence/drizzle-user.adapter.test.ts

describe('DrizzleUserAdapter', () => {
  let db:      Database
  let adapter: DrizzleUserAdapter

  beforeAll(async () => {
    ({ db } = await setupTestDatabase())
    adapter = new DrizzleUserAdapter(db)
  })
  afterAll(teardown)
  beforeEach(() => cleanDb(db))

  it('guarda y recupera un usuario por id', async () => {
    const user = User.create({ phone: '612345678', role: 'chooser' })
    await adapter.save(user)

    const found = await adapter.findById(user.id)
    expect(found?.id).toBe(user.id)
    expect(found?.role).toBe('chooser')
  })
})
```

---

## Tests de seguridad — obligatorios

Estos tests deben existir y pasar antes de cualquier merge que toque autenticación
o acceso a datos de usuarios:

```typescript
// tests/security/tenant-isolation.test.ts

describe('Tenant isolation', () => {
  it('usuario A no puede leer datos de usuario B', async () => {
    const tokenA = await loginAs(userA)
    const res = await app.inject({
      method:  'GET',
      url:     `/me/data`,
      headers: { authorization: `Bearer ${tokenA}`,
                 'x-user-id': userB.id },  // intento de IDOR vía header
    })
    // El gateway sobreescribe el header — solo devuelve datos de A
    expect(res.json().data.userId).toBe(userA.id)
  })

  it('los logs no contienen DEK ni password', async () => {
    const logSpy = vi.spyOn(logger, 'info')
    await loginAs(userA)

    const allLogs = logSpy.mock.calls.map(([obj]) => JSON.stringify(obj)).join('\n')
    const forbidden = ['dek', 'kek', 'password', 'passwordHash', 'derivedKey']

    for (const field of forbidden) {
      expect(allLogs).not.toMatch(new RegExp(`"${field}"\\s*:`))
    }
  })
})
```

---

## Nombrado de tests

```
describe: nombre de la clase o función que se testea
it:       qué hace + en qué condición (sin "should")

✅ it('crea un usuario y publica job de OTP')
✅ it('lanza UserAlreadyExistsError si el teléfono ya está registrado')
❌ it('should create a user')
❌ it('test register')
```

---

## Cobertura mínima exigida

```
domain/      → 90% líneas y funciones
application/ → 80% líneas y funciones
infrastructure/ → cubierto principalmente por tests de integración
```

Configurar en `vitest.config.ts` de cada servicio:

```typescript
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        'src/domain/**':      { lines: 90, functions: 90 },
        'src/application/**': { lines: 80, functions: 80 },
      },
    },
  },
})
```
