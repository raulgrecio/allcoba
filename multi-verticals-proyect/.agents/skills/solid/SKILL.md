# Skill: Principios SOLID

Aplican a todo el código de Allcoba — servicios, packages y apps.
Lee este fichero junto con `hexagonal-architecture/SKILL.md` antes de diseñar cualquier clase o módulo.

---

## S — Single Responsibility Principle

Cada clase, módulo o función tiene **una sola razón para cambiar**.

```typescript
// ❌ INCORRECTO — mezcla validación, persistencia y notificación
class UserService {
  async register(phone: string, role: string) {
    if (!isValidPhone(phone)) throw new Error('Invalid phone')
    await db.insert(users).values({ phone, role })
    await sendSms(phone, 'Welcome!')
  }
}

// ✅ CORRECTO — cada pieza tiene una responsabilidad
// Phone.create()        → valida y normaliza el teléfono
// RegisterUserUseCase   → orquesta el flujo de registro
// DrizzleUserAdapter    → persiste en BD
// NotificationService   → envía el SMS
```

En la práctica:
- Un **Use Case** = un flujo de negocio. Si un use case hace dos cosas distintas, separarlo.
- Un **Value Object** = validar y normalizar un tipo de dato. No persistir, no loggear.
- Un **Adapter** = traducir entre dominio e infraestructura. No contener lógica de negocio.
- Un **Port** = definir un contrato. Una interfaz por responsabilidad, no mega-interfaces.

---

## O — Open/Closed Principle

Abierto a extensión, cerrado a modificación.
Añadir nuevos comportamientos sin tocar código existente.

```typescript
// ❌ INCORRECTO — añadir un vertical nuevo obliga a modificar esta función
function getNormalizer(vertical: string) {
  if (vertical === 'massage') return new MassageNormalizer()
  if (vertical === 'car')     return new CarNormalizer()
  // cada nuevo vertical = modificar esta función
}

// ✅ CORRECTO — registro de normalizadores, extensible sin modificar
const normalizers = new Map<string, Normalizer>([
  ['massage', new MassageNormalizer()],
  ['car',     new CarNormalizer()],
])

function getNormalizer(vertical: string): Normalizer {
  const n = normalizers.get(vertical)
  if (!n) throw new UnknownVerticalError(vertical)
  return n
}
// Añadir 'dating' = registrar una entrada. Nada más.
```

En la práctica:
- Ports + Adapters implementan OCP: cambiar de proveedor = nuevo adapter, no tocar use cases.
- Evitar `if/else` o `switch` que crezcan con cada nueva vertical, fuente o tipo.

---

## L — Liskov Substitution Principle

Cualquier implementación de un Port debe ser intercambiable sin que el use case lo note.

```typescript
// ✅ CORRECTO — el use case no sabe si habla con Drizzle, in-memory o un fake
class RegisterUserUseCase {
  constructor(private readonly userRepo: UserRepositoryPort) {}
  // funciona igual con DrizzleUserAdapter, InMemoryUserAdapter o FakeUserRepository
}

// ❌ INCORRECTO — el adapter rompe el contrato del Port
class BrokenUserAdapter implements UserRepositoryPort {
  async findById(id: string): Promise<User | null> {
    throw new Error('Not implemented') // viola LSP — el caller espera User | null
  }
}
```

En la práctica:
- Los fakes de tests deben implementar el Port completo y comportarse igual que el adapter real.
- Si una implementación no puede cumplir el contrato, el Port está mal diseñado.

---

## I — Interface Segregation Principle

Interfaces pequeñas y específicas. Nunca forzar a implementar métodos que no se necesitan.

```typescript
// ❌ INCORRECTO — mega-interface que no todos los adapters necesitan
interface UserRepositoryPort {
  findById(id: string): Promise<User | null>
  findByPhoneHash(hash: string): Promise<User | null>
  save(user: User): Promise<void>
  delete(id: string): Promise<void>
  findAll(): Promise<User[]>          // el scraper nunca necesita esto
  bulkInsert(users: User[]): Promise<void>  // solo el seed lo usa
}

// ✅ CORRECTO — interfaces segregadas por uso real
interface UserReaderPort {
  findById(id: string): Promise<User | null>
  findByPhoneHash(hash: string): Promise<User | null>
}

interface UserWriterPort {
  save(user: User): Promise<void>
  delete(id: string): Promise<void>
}

// El use case declara solo lo que usa
class LoginUserUseCase {
  constructor(private readonly userRepo: UserReaderPort) {}
}
```

En la práctica:
- Un Port por responsabilidad de lectura/escritura si los use cases divergen.
- Un use case solo declara en su constructor los Ports que realmente usa.

---

## D — Dependency Inversion Principle

El dominio y los use cases dependen de **abstracciones** (Ports), nunca de implementaciones concretas.

```typescript
// ❌ INCORRECTO — el use case importa directamente el adapter de Drizzle
import { DrizzleUserAdapter } from '#infrastructure/persistence/drizzle-user.adapter.js'

class RegisterUserUseCase {
  private userRepo = new DrizzleUserAdapter(db) // acoplado a Drizzle
}

// ✅ CORRECTO — el use case recibe la abstracción por constructor
import type { UserRepositoryPort } from '#application/ports/user-repository.port.js'

class RegisterUserUseCase {
  constructor(private readonly userRepo: UserRepositoryPort) {}
  // el adapter concreto se inyecta desde infrastructure/
}
```

En la práctica:
- Los use cases **nunca** importan desde `infrastructure/`.
- El dominio **nunca** importa nada de fuera del package (`@allcoba/domain` puede importar de `@allcoba/kernel`, nada más).
- La composición (inyectar el adapter concreto) ocurre en `src/index.ts` o en un composition root.
- Usar `import type` para Ports en use cases — refuerza que no hay dependencia en runtime.

---

## Relación SOLID ↔ Arquitectura hexagonal

| SOLID | Dónde aplica en Allcoba |
|-------|------------------------|
| SRP | Un use case = un flujo. Un VO = un tipo. Un adapter = un sistema externo. |
| OCP | Ports + Adapters — nuevo proveedor = nuevo adapter, use cases intactos. |
| LSP | Fakes de tests son intercambiables con adapters reales. |
| ISP | Ports pequeños por use case, no mega-interfaces. |
| DIP | Use cases dependen de Ports (interfaces), nunca de Adapters (clases concretas). |
