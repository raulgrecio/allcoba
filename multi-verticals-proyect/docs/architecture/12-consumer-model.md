# 12 · Modelo del consumer

> El consumer es el comprador/cliente. Anónimo por defecto.
> Su identidad real sólo la conoce el provider con quien ha interactuado.

---

## Entidad Consumer (dominio)

```typescript
interface Consumer {
  id: string;
  consumerHash: string; // SHA-256(id + platformSalt) — identidad cruzable sin revelar
  isAnonymous: boolean; // true hasta que elige identificarse
  isVerified: boolean; // ha verificado identidad (sin revelarla a providers)
  plan: 'free'; // de momento sólo free
  createdAt: Date;
}
```

---

## Anonimato por capas

El consumer tiene tres niveles de identidad en el sistema:

```
Nivel 1 — Anónimo total (defecto)
  El provider sólo ve: "alguien está interesado"
  No hay nombre, no hay foto, no hay teléfono.
  El consumer_hash permite al provider saber si ya han hablado antes.

Nivel 2 — Identidad revelada al provider (opcional, por el consumer)
  El consumer decide compartir nombre y teléfono con ese provider concreto.
  Esta información queda cifrada en el schema del provider.
  Sólo ese provider puede verla.

Nivel 3 — Verificado (sin revelar quién es)
  El consumer ha verificado su identidad ante la plataforma (DNI o similar),
  pero los providers sólo ven un badge "verificado" — no los datos.
  Aumenta la confianza sin sacrificar privacidad.
```

---

## Trust score del consumer

Lo que otros providers pueden ver de un consumer (sin datos personales):

```typescript
interface ConsumerPublicSignals {
  consumerHash: string; // identificador opaco — no reversible
  punctualityScore: number; // 0-5, promedio de todos sus providers
  paymentScore: number;
  communicationScore: number;
  totalInteractions: number; // cuántas interacciones verificadas tiene
  isVerified: boolean;
  memberSince: string; // 'YYYY-MM' — mes de registro, no fecha exacta
}
```

---

## Perfil del consumer en la app

```typescript
interface ConsumerProfile {
  id: string;
  displayName?: string; // alias, no nombre real
  avatarUrl?: string;
  preferredVerticals: string[]; // verticales de interés para recomendaciones
  locationPreference?: GeoPoint; // para búsquedas por defecto
  notificationPrefs: {
    newMessages: boolean;
    providerAvailability: boolean;
    savedProviderUpdates: boolean;
  };
}
```

---

## Interacciones del consumer

El consumer puede guardar providers favoritos y ver su historial de contactos. La información de cada conversación la controla el provider — el consumer sólo ve el estado.

```typescript
interface ConsumerInteraction {
  conversationId: string;
  providerId: string;
  providerName: string; // dato público
  vertical: string;
  status: ConversationStatus;
  initiatedAt: Date;
  lastActivityAt: Date;
}

type ConversationStatus =
  | 'pending' // enviado, sin respuesta del provider
  | 'active' // en conversación
  | 'completed' // finalizado por cualquiera de los dos
  | 'expired' // sin respuesta en 7 días
  | 'rated'; // el consumer ha dejado review
```
