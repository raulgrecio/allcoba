# CLAUDE.md — packages/domain

> Capa de dominio pura. El corazón del sistema.
> Lee también el CLAUDE.md raíz del proyecto antes de trabajar aquí.

---

## Regla absoluta

**Este package no tiene ninguna dependencia de infraestructura.**

No importa Fastify. No importa Drizzle. No importa PostgreSQL. No importa Node.js crypto directamente. Si un test de este package necesita levantar una base de datos o una instancia de Fastify, es un error de arquitectura — no un problema del test.

Las únicas dependencias permitidas son:
- `zod` — para value objects con validación
- `@marketplace/shared-types` — tipos compartidos entre packages
- Nada más

---

## Qué vive aquí

```
packages/domain/src/
├── provider/
│   ├── provider.entity.ts          ← entidad Provider con sus invariantes
│   ├── provider.errors.ts          ← ProviderNotFoundError, ProviderInactiveError...
│   └── value-objects/
│       ├── slug.vo.ts              ← Slug: validación, normalización desde displayName
│       ├── geo-point.vo.ts         ← GeoPoint: lat/lng con rangos válidos
│       └── service-price.vo.ts     ← ServicePrice: cents, validación no negativo
├── consumer/
│   ├── consumer.entity.ts
│   └── consumer.errors.ts
├── conversation/
│   ├── conversation.entity.ts      ← máquina de estados de la conversación
│   ├── conversation.errors.ts
│   └── conversation.rules.ts       ← reglas de negocio puras (cooldown, expiración...)
├── reputation/
│   ├── trust-score.entity.ts
│   ├── review.entity.ts
│   └── anti-manipulation.ts        ← detección de spike de reviews
├── vertical/
│   ├── vertical.entity.ts
│   └── vertical-config.types.ts    ← tipos de configuración de vertical
└── index.ts                        ← barrel export
```

---

## Cómo modelar una entidad

Las entidades tienen un constructor privado y un factory method estático `create()` que valida los invariantes. No se instancian con `new` directamente desde fuera del dominio.

```typescript
// packages/domain/src/provider/provider.entity.ts

export class Provider {
  private constructor(
    public readonly id: string,
    public readonly slug: Slug,
    public readonly displayName: string,
    public readonly location: GeoPoint,
    public readonly verticalId: string,
    public isActive: boolean,
    public isVerified: boolean,
  ) {}

  static create(props: CreateProviderProps): Provider {
    // Validar invariantes — lanzar errores de dominio si no se cumplen
    if (!props.displayName || props.displayName.trim().length < 2) {
      throw new InvalidProviderNameError(props.displayName)
    }
    return new Provider(
      props.id ?? crypto.randomUUID(),
      Slug.fromDisplayName(props.displayName),
      props.displayName.trim(),
      GeoPoint.create(props.lat, props.lng),
      props.verticalId,
      true,
      false,
    )
  }

  // Métodos de dominio — la lógica de negocio vive aquí
  activate(): void {
    if (this.isActive) throw new ProviderAlreadyActiveError(this.id)
    this.isActive = true
  }

  suspend(reason: string): DomainEvent {
    this.isActive = false
    return new ProviderSuspendedEvent(this.id, reason)
  }
}
```
