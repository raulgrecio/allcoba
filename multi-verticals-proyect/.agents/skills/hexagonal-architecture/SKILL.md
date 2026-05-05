# Skill: Arquitectura hexagonal

Cómo estructurar el código dentro de cada servicio de Allcoba.
Lee este fichero antes de crear cualquier fichero en `services/` o `packages/`.

---

## Las tres capas — regla de dependencias

```
Domain        ← no importa nada de fuera (ni Fastify, ni Drizzle, ni PostgreSQL)
   ↑
Application   ← importa Domain. Define Ports (interfaces). No importa infraestructura.
   ↑
Infrastructure ← importa Application y Domain. Implementa los Ports. Importa librerías.
```

Si un fichero en `domain/` importa algo de `infrastructure/` o de una librería externa
como Drizzle o Fastify, es un error de arquitectura. No continuar — corregir primero.

---

## Estructura de carpetas dentro de cada servicio

```
services/auth-service/src/
├── domain/
│   ├── entities/
│   │   └── user.entity.ts        ← clase con constructor privado + factory method
│   ├── value-objects/
│   │   └── phone.vo.ts           ← validación + normalización encapsulada
│   └── errors/
│       └── auth.errors.ts        ← clases de error tipadas
├── application/
│   ├── use-cases/
│   │   └── register-user.use-case.ts  ← un fichero por use case
│   └── ports/
│       └── user-repository.port.ts    ← interface, nunca implementación
└── infrastructure/
    ├── persistence/
    │   └── drizzle-user.adapter.ts    ← implementa UserRepositoryPort
    ├── http/
    │   └── auth.routes.ts             ← routes de Fastify
    └── schema/
        └── auth.schema.ts             ← schema de Drizzle para este servicio
```

---

## Entidades de dominio

Constructor privado + factory method estático `create()` que valida invariantes:

```typescript
// domain/entities/user.entity.ts

export class User {
  private constructor(
    public readonly id: string,
    public readonly phoneHash: string,
    public readonly role: UserRole,
    public readonly status: UserStatus,
    public readonly createdAt: Date,
  ) {}

  static create(props: CreateUserProps): User {
    if (!props.phone || props.phone.trim().length < 9) {
      throw new InvalidPhoneError(props.phone)
    }
    return new User(
      props.id ?? crypto.randomUUID(),
      hashPhone(props.phone),
      props.role,
      'pending_verification',
      new Date(),
    )
  }

  // Métodos de dominio — la lógica de negocio vive aquí
  activate(): User {
    if (this.status === 'active') throw new UserAlreadyActiveError(this.id)
    return new User(this.id, this.phoneHash, this.role, 'active', this.createdAt)
  }
}
```

---

## Value Objects (domain/value-objects/)

Encapsulan validación y normalización. Nunca lanzar excepciones — devolver `ValidationResult<T>`.

```typescript
// domain/value-objects/phone.vo.ts

export class Phone extends ValueObject {
  private constructor(
    public readonly e164: string,
    public readonly countryCode: string,
  ) { super() }

  static create(raw: string, country: string): ValidationResult<Phone> {
    const parsed = parsePhoneNumber(raw, country)
    if (!parsed?.isValid()) {
      return failOne(`Invalid phone: ${raw}`)
    }
    return ok(new Phone(parsed.format('E.164'), country))
  }

  equals(other: ValueObject): boolean {
    return other instanceof Phone && this.e164 === other.e164
  }

  toJSON(): string { return this.e164 }
}
```

**Reglas de los Value Objects:**
- `private constructor` — solo se instancian via `static create()`
- `create()` devuelve `ValidationResult<T>` — nunca lanza. El caller decide qué hacer con el error.
- `equals()` compara por valor, no por referencia
- `toJSON()` devuelve el tipo primitivo serializable para persistencia
- Son inmutables — ningún setter, ningún método que mute estado

**`ValidationResult<T>`** (definido en `@allcoba/kernel` o `@allcoba/domain`):
```typescript
type ValidationResult<T> =
  | { success: true;  value: T }
  | { success: false; errors: string[] }
```

**Dónde vive cada VO:**
- `packages/domain/src/value-objects/` — VOs compartidos entre servicios (`Phone`, `Email`, `Price`, `ImageHash`, `ProviderId`, `Url`, `Telegram`, `PostalCode`, `Address`)
- `services/<name>/src/domain/value-objects/` — VOs específicos del servicio que no tienen sentido fuera (`ConfidenceScore`, `ExternalId`, `ScrapedAddress`)

**Enums no necesitan VO.** Un `enum Vertical` o `enum UserRole` ya es tipo seguro — no wrappear en clase.

---

## Aggregate Roots (domain/aggregates/)

Un Aggregate Root es la entidad principal de un bounded context. Controla el acceso a los objetos internos y garantiza la consistencia de invariantes.

```typescript
// domain/aggregates/scraped-provider.aggregate.ts

export class ScrapedProvider {
  private constructor(
    public readonly id: ProviderId,
    public readonly phones: readonly Phone[],
    public readonly confidenceScore: ConfidenceScore,
    // ... resto de props
  ) {}

  static create(props: CreateScrapedProviderProps): ScrapedProvider {
    return new ScrapedProvider(
      props.id,
      props.phones ?? [],
      props.confidenceScore ?? ConfidenceScore.low(),
      // ...
    )
  }

  // Métodos de consulta — no mutan estado
  hasPhone(phone: Phone): boolean {
    return this.phones.some(p => p.equals(phone))
  }

  // Merge inmutable — devuelve nueva instancia, nunca muta this
  merge(updates: MergeProps): ScrapedProvider {
    return new ScrapedProvider(
      this.id,
      deduplicatePhones([...this.phones, ...(updates.phones ?? [])]),
      updates.confidenceScore ?? this.confidenceScore,
      // regla: campos existentes ganan (no sobreescribir lo que el usuario puso)
    )
  }
}
```

**Reglas del Aggregate:**
- `private constructor` + `static create()` — mismo patrón que VO
- `merge()` devuelve **nueva instancia** — nunca mutar `this`
- Las colecciones internas son `readonly` — no exponer arrays mutables
- Métodos de consulta (`hasPhone`, `findBySource`) viven en el aggregate, no en el adapter
- El adapter nunca accede a las props internas del aggregate para filtrar — usa los métodos del aggregate

---

## Ports (interfaces en application/)

Los Ports definen QUÉ necesita el use case, sin saber CÓMO se implementa:

```typescript
// application/ports/user-repository.port.ts

export interface UserRepositoryPort {
  findById(id: string): Promise<User | null>
  findByPhoneHash(phoneHash: string): Promise<User | null>
  save(user: User): Promise<void>
  delete(id: string): Promise<void>
}
```

---

## Use Cases (application/use-cases/)

Un fichero por use case. Recibe los Ports por constructor (inyección de dependencias).
No sabe nada de HTTP, bases de datos ni librerías externas:

```typescript
// application/use-cases/register-user.use-case.ts

export class RegisterUserUseCase {
  constructor(
    private readonly userRepo: UserRepositoryPort,
    private readonly queue: QueuePort,
  ) {}

  async execute(dto: RegisterUserDTO): Promise<void> {
    const existing = await this.userRepo.findByPhoneHash(hashPhone(dto.phone))
    if (existing) throw new UserAlreadyExistsError()

    const user = User.create({ phone: dto.phone, role: dto.role })
    await this.userRepo.save(user)

    await this.queue.publish('send-notification', {
      type:        'otp_requested',
      recipientId: user.id,
      data:        {},
    })
  }
}
```

---

## Adapters (infrastructure/)

Implementan los Ports. Aquí vive Drizzle, Fastify, pgcrypto, R2, etc.:

```typescript
// infrastructure/persistence/drizzle-user.adapter.ts

export class DrizzleUserAdapter implements UserRepositoryPort {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.db.query.users.findFirst({
      where: eq(schema.users.id, id),
    })
    if (!row) return null
    return this.toDomain(row)
  }

  async save(user: User): Promise<void> {
    await this.db.insert(schema.users)
      .values(this.toRow(user))
      .onConflictDoUpdate({
        target: schema.users.id,
        set:    this.toRow(user),
      })
  }

  private toDomain(row: UserRow): User {
    // mapear de row de BD a entidad de dominio
  }

  private toRow(user: User): UserRow {
    // mapear de entidad de dominio a row de BD
  }
}
```

---

## Fakes para tests (no mocks de librería)

Los tests de use cases usan fakes in-memory, no mocks de Jest/Vitest:

```typescript
// tests/fakes/user-repository.fake.ts

export class FakeUserRepository implements UserRepositoryPort {
  private store = new Map<string, User>()

  async findById(id: string)            { return this.store.get(id) ?? null }
  async findByPhoneHash(hash: string)   {
    return [...this.store.values()].find(u => u.phoneHash === hash) ?? null
  }
  async save(user: User)                { this.store.set(user.id, user) }
  async delete(id: string)              { this.store.delete(id) }

  // Helper para tests
  seed(user: User)                      { this.store.set(user.id, user); return this }
  all()                                 { return [...this.store.values()] }
}
```
