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
