# 11 · Modelo del provider

> El provider es el vendedor/negocio. Tiene ficha pública, catálogo de servicios,
> disponibilidad, y puede pertenecer a una agencia.

---

## Entidad Provider (dominio)

```typescript
// packages/domain/src/provider/provider.entity.ts

interface Provider {
  id: string;
  verticalId: string;
  slug: string; // URL amigable: 'salon-ana-madrid'
  displayName: string;
  bio?: string;
  location: GeoPoint;
  addressText: string; // dirección legible
  attributes: Record<string, unknown>; // atributos de la vertical (ver vertical-system.md)
  isActive: boolean;
  isVerified: boolean; // verificado por la plataforma
  agencyId?: string; // null si es independiente
  plan: ProviderPlan;
  availability: AvailabilityConfig;
  mediaIds: string[]; // IDs de imágenes aprobadas, ordenadas
  createdAt: Date;
}

type ProviderPlan = 'free' | 'basic' | 'pro';

interface GeoPoint {
  lat: number;
  lng: number;
}
```

---

## Disponibilidad

El provider indica cuándo está disponible para recibir contactos. Esta información es pública y se muestra en tiempo real en la ficha.

```typescript
interface AvailabilityConfig {
  mode: 'schedule' | 'manual' | 'always';

  // mode: 'schedule' — horario semanal
  schedule?: {
    [day in 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun']?: TimeSlot[];
  };

  // mode: 'manual' — el provider activa/desactiva manualmente
  isOpenNow?: boolean;

  // Para todos los modos
  nextAvailableAt?: Date; // si está cerrado ahora, cuándo abre
  acceptsUrgent: boolean; // si acepta contactos fuera de horario
}

interface TimeSlot {
  from: string; // 'HH:MM'
  to: string;
}

// Ejemplo: peluquería con horario y urgencias
const availability: AvailabilityConfig = {
  mode: 'schedule',
  schedule: {
    mon: [
      { from: '09:00', to: '14:00' },
      { from: '16:00', to: '20:00' },
    ],
    tue: [
      { from: '09:00', to: '14:00' },
      { from: '16:00', to: '20:00' },
    ],
    sat: [{ from: '09:00', to: '14:00' }],
  },
  acceptsUrgent: false,
};
```

---

## Agencias

Una agencia es un grupo de providers que comparten identidad comercial o dirección física. Los providers de una agencia pueden tener listings propios y también listings compartidos de la agencia.

```typescript
interface Agency {
  id: string;
  name: string;
  slug: string;
  location: GeoPoint;
  addressText: string;
  attributes: Record<string, unknown>;
  memberProviderIds: string[];
}

// Reglas de agencia:
// - Un provider puede pertenecer a máximo 1 agencia
// - La agencia no tiene DEK propia — cada provider mantiene la suya
// - Los clientes siguen siendo de cada provider individual, no de la agencia
// - La agencia puede tener una ficha pública propia (listings agregados)
```

---

## Ficha pública del provider (lo que ve el consumer)

```typescript
// Lo que la API devuelve en GET /api/v1/providers/:slug
interface PublicProviderProfile {
  id: string;
  slug: string;
  displayName: string;
  bio?: string;
  addressText: string;
  distanceMeters?: number; // calculado si el consumer tiene ubicación
  attributes: Record<string, unknown>;
  services: PublicService[];
  availability: {
    isOpenNow: boolean;
    nextAvailableAt?: string;
    schedule?: AvailabilityConfig['schedule'];
  };
  media: { url: string; order: number }[];
  trustScore: PublicTrustScore;
  isVerified: boolean;
  agencyName?: string;
  reviewCount: number;
  reviewSummary?: string; // generado por IA a partir de reviews
}

interface PublicTrustScore {
  overall: number; // 0-5
  dimensions: {
    [dimension: string]: number; // sólo dimensiones de la vertical
  };
  totalReviews: number;
}
```

---

## Estados del provider

```
registered → pending_verification → active → suspended → deleted

- registered: se ha dado de alta pero no ha completado el perfil
- pending_verification: ha completado el perfil, espera aprobación de la plataforma
- active: visible en búsquedas y puede recibir contactos
- suspended: infracción — no visible, mantiene sus datos
- deleted: soft delete — datos retenidos 90 días por RGPD, luego anonimizados
```
