# Skill: TypeScript

Convenciones de TypeScript para todos los servicios de Allcoba.
Lee este fichero antes de escribir cualquier código TypeScript en el proyecto.

---

## Configuración base

Todos los servicios usan `"moduleResolution": "bundler"` y `"module": "ESNext"`.
Los imports SIEMPRE incluyen la extensión `.js` aunque el fichero sea `.ts`:

```typescript
// ✅ CORRECTO
import { logger } from './logger.js'
import { User }   from '../domain/user.entity.js'

// ❌ INCORRECTO
import { logger } from './logger'
import { User }   from '../domain/user.entity'
```

---

## Workspace packages — condición `"source"` en exports

Todo package interno del monorepo que compile a `dist/` debe incluir la condición `"source"` en su `exports`. Sin ella, los servicios dependientes necesitan rebuild cada vez que cambia el package — inaceptable en desarrollo.

```json
// packages/domain/package.json
{
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

Y cada servicio que consuma workspace packages configura Vitest para usar esa condición:

```ts
// services/*/vitest.config.ts
export default defineConfig({
  resolve: {
    conditions: ['source'],
  },
  test: { ... }
})
```

Con esto, Vitest lee directamente el `.ts` fuente — cero rebuild necesario durante desarrollo. El `dist/` sigue siendo necesario para producción y para `tsc --noEmit`.

Si un package tiene subpath exports (`./logger`, `./queue`), añadir `"source"` a cada uno:

```json
"./logger": {
  "source": "./src/logger/index.ts",
  "import": "./dist/logger/index.js",
  "types": "./dist/logger/index.d.ts"
}
```

---

## Imports internos del paquete — subpath imports `#`

Para importar módulos internos dentro del mismo servicio/paquete, usar el estándar Node.js `#` (subpath imports). Nunca usar alias `@alias/` ni rutas relativas largas `../../../`:

```typescript
// ✅ CORRECTO — subpath imports estándar Node.js
import { ScrapedProvider } from '#domain/aggregates/scraped-provider.aggregate.js'
import { ScrapeUrlUseCase } from '#application/use-cases/scrape-url.use-case.js'
import { JsonFileProviderRepository } from '#infrastructure/adapters/persistence/json-file-provider.repository.js'

// ❌ INCORRECTO — alias vitest-only, colisiona con scoped packages npm
import { ScrapedProvider } from '@scraper/domain/aggregates/scraped-provider.aggregate.js'

// ❌ INCORRECTO — rutas relativas largas, frágiles ante reorganizaciones
import { ScrapedProvider } from '../../../domain/aggregates/scraped-provider.aggregate.js'
```

Cada servicio/paquete necesita estas dos configuraciones:

```json
// package.json
{
  "imports": {
    "#*": "./src/*"
  }
}
```

```json
// tsconfig.json — dentro de compilerOptions
{
  "paths": {
    "#*": ["src/*"]
  }
}
```

No añadir alias en `vitest.config.ts` — Vitest 2.x/Vite 5.x resuelve `#` via `package.json "imports"` de forma nativa.

**Por qué `#` y no `@alias`:** El prefijo `#` está reservado por la spec de Node.js para package self-imports. Ningún paquete npm puede publicarse con `#` — cero colisiones posibles.

---

## Strictness — sin excepciones

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitReturns": true
}
```

Nunca usar `any`. Si el tipo es desconocido usar `unknown` y narrowing.
Nunca usar `as` para castear excepto en tests con datos de fixture bien controlados.

---

## Exports

- **Named exports** en todos los módulos de dominio, application e infraestructura
- **Default export** solo en `index.ts` entry points y en ficheros de Fastify plugins
- **Barrel exports** en `index.ts` de cada capa — nunca importar rutas internas desde fuera

```typescript
// ✅ packages/domain/src/user/index.ts
export { User }               from './user.entity.js'
export { InvalidCredentialsError } from './user.errors.js'
export type { CreateUserProps }    from './user.entity.js'

// ✅ Consumir desde fuera
import { User } from '@allcoba/domain'

// ❌ Nunca importar rutas internas desde fuera del package
import { User } from '@allcoba/domain/src/user/user.entity.js'
```

---

## Tipos vs Interfaces

- `interface` para contratos que pueden ser implementados por clases (Ports, entidades)
- `type` para uniones, intersecciones, aliases y tipos de datos puros

```typescript
// interface — para ports e implementaciones
interface UserRepositoryPort {
  findById(id: string): Promise<User | null>
  save(user: User): Promise<void>
}

// type — para datos y uniones
type UserRole = 'presenter' | 'chooser' | 'platform_admin'
type CreateUserProps = { phone: string; role: UserRole }
```

---

## Async / await

Siempre `async/await`. Nunca `.then()/.catch()` encadenados excepto en casos muy específicos.
Las funciones async siempre tienen tipo de retorno explícito:

```typescript
// ✅ CORRECTO
async function findUser(id: string): Promise<User | null> {
  return userRepo.findById(id)
}

// ❌ INCORRECTO — tipo de retorno implícito
async function findUser(id: string) {
  return userRepo.findById(id)
}
```

---

## Errores

Nunca lanzar strings. Siempre clases de error tipadas:

```typescript
// ✅ CORRECTO
throw new InvalidCredentialsError('Phone or password incorrect')

// ❌ INCORRECTO
throw new Error('invalid credentials')
throw 'invalid credentials'
```

Las clases de error de dominio extienden `Error` con nombre explícito:

```typescript
export class InvalidCredentialsError extends Error {
  readonly code = 'INVALID_CREDENTIALS'
  constructor(message = 'Invalid credentials') {
    super(message)
    this.name = 'InvalidCredentialsError'
  }
}
```

---

## Nullability

Preferir `undefined` sobre `null` en tipos propios del proyecto.
`null` solo cuando la BD o una librería externa lo devuelve explícitamente.

```typescript
// ✅ CORRECTO — undefined en tipos propios
interface User {
  bio?: string          // undefined si no hay bio
  agencyId?: string
}

// Drizzle puede devolver null — aceptable en adapters
const row = await db.query.users.findFirst(...)
const bio = row?.bio ?? undefined  // convertir null a undefined en el adapter
```

---

## Comentarios

Solo cuando el código no puede explicarse por sí solo.
Nunca comentarios obvios:

```typescript
// ❌ INCORRECTO — obvio
// Encontrar el usuario por id
const user = await userRepo.findById(id)

// ✅ CORRECTO — aporta contexto no obvio
// 404 deliberado — no revelar si el recurso existe (evitar IDOR)
if (user?.providerId !== request.tenantId) {
  throw new NotFoundError()
}
```
