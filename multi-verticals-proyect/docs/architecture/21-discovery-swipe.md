# 21 · Discovery social — Swipe, matching y niveles de visibilidad

> El consumer hace swipe sobre fichas de providers dentro de una vertical.
> El sistema aprende sus gustos y reordena los resultados de búsqueda.
> El matching **es bidireccional**: el provider puede silenciar, bloquear o ignorar a un consumer.
> Los niveles de visibilidad determinan qué ve cada parte sin revelar que hay un bloqueo.

---

## Qué verticales tienen esta característica

El swipe es opt-in por vertical, controlado por `features.swipe` en la config de la vertical.

```
hairdresser:  swipe: true   ← gusto personal, subjetivo
massage:      swipe: true
real-estate:  swipe: false  ← decisión racional (precio, zona)
car:          swipe: false
```

---

## Modelo de datos

### Señales del consumer (swipe)

```sql
CREATE TABLE swipe_signals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id       UUID NOT NULL,
  provider_id       UUID NOT NULL REFERENCES providers(id),
  vertical          TEXT NOT NULL,
  signal            TEXT NOT NULL
                    CHECK (signal IN ('like', 'pass', 'super_like')),
  position_in_deck  INTEGER,
  session_id        TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_swipe_consumer_vertical
  ON swipe_signals(consumer_id, vertical, created_at DESC);
```

### Preferencias aprendidas por consumer

```sql
CREATE TABLE consumer_preferences (
  consumer_id        UUID NOT NULL,
  vertical           TEXT NOT NULL,
  attribute_weights  JSONB NOT NULL DEFAULT '{}',
  seen_provider_ids  UUID[] NOT NULL DEFAULT '{}',
  liked_provider_ids UUID[] NOT NULL DEFAULT '{}',
  last_updated       TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (consumer_id, vertical)
);
```

### Relaciones provider → consumer (matching bidireccional)

```sql
CREATE TABLE provider_consumer_relations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id      UUID NOT NULL REFERENCES providers(id),
  consumer_hash    TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'normal'
                   CHECK (status IN ('normal', 'silenced', 'blocked', 'preferred')),
  silenced_until   TIMESTAMPTZ,   -- NULL = silencio indefinido
  reason_enc       BYTEA,         -- motivo cifrado con DEK del provider
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (provider_id, consumer_hash)
);

CREATE INDEX idx_pcr_provider ON provider_consumer_relations(provider_id, status);
CREATE INDEX idx_pcr_consumer ON provider_consumer_relations(consumer_hash, status);

-- Bans de plataforma — gestionados sólo por platform_admin
CREATE TABLE platform_bans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_hash TEXT NOT NULL UNIQUE,
  reason        TEXT NOT NULL,
  banned_by     UUID NOT NULL,
  banned_at     TIMESTAMPTZ DEFAULT now(),
  expires_at    TIMESTAMPTZ,   -- NULL = permanente
  is_active     BOOLEAN DEFAULT true
);

CREATE INDEX idx_bans_consumer ON platform_bans(consumer_hash) WHERE is_active = true;
```

---

## Los tres niveles de visibilidad

```
NIVEL 1 — SILENCIADO (provider silencia a un consumer)
══════════════════════════════════════════════════════
  Consumer ve la ficha del provider:       SÍ
  Consumer puede contactar:                SÍ — el mensaje SE ENVÍA
  Provider recibe notificación:            NO
  Dónde van los mensajes:                  "Archivados" — sin notificación push
  Lo sabe el consumer:                     NO — experiencia normal para él
  Quién lo aplica:                         El provider
  Duración:                                Definida (ej: 1 semana) o indefinida

  Casos de uso: cliente pesado, cancelación sin aviso,
                filtrar sin confrontación directa.

NIVEL 2 — BLOQUEADO (provider bloquea a un consumer)
═════════════════════════════════════════════════════
  Consumer ve la ficha del provider:       SÍ
  Consumer puede contactar:                NO
  Mensaje al consumer:                     Genérico: "Este profesional no está
                                           disponible para nuevas reservas"
  Lo sabe el consumer:                     VE que no puede contactar,
                                           NO sabe que es un bloqueo personal
  Quién lo aplica:                         El provider
  Duración:                                Indefinida

  Casos de uso: mala calificación del consumer,
                conflicto previo, rechazo definitivo.

NIVEL 3 — BANEADO DE PLATAFORMA
═════════════════════════════════
  Consumer ve al provider baneado:         NO — es invisible para él
  Consumer puede usar la plataforma:       Restricción total o parcial
  Lo sabe el consumer:                     Puede recibir notificación genérica
  Quién lo aplica:                         Sólo platform_admin
  Duración:                                Definida o permanente

  Casos de uso: fraude, acoso, violación de términos.
```

---

## Implementación del comprobador de visibilidad

```typescript
// packages/kernel/src/visibility/visibility-checker.ts

export class VisibilityChecker {

  async canConsumerSeeProvider(
    consumerHash: string,
    providerId: string
  ): Promise<boolean> {
    // Ban de plataforma → provider invisible para este consumer
    const ban = await banRepo.findActive(consumerHash)
    if (ban) return false

    // Bloqueo del provider → el consumer PUEDE seguir viendo la ficha
    // (sólo pierde la capacidad de contactar)
    return true
  }

  async canConsumerContact(
    consumerHash: string,
    providerId: string
  ): Promise<ContactPermission> {
    const ban = await banRepo.findActive(consumerHash)
    if (ban) return { allowed: false, reason: 'platform_banned' }

    const relation = await relationRepo.find(providerId, consumerHash)

    if (!relation || relation.status === 'normal' || relation.status === 'preferred') {
      return { allowed: true }
    }

    if (relation.status === 'silenced') {
      // Comprobar si el silencio ha expirado
      if (relation.silencedUntil && relation.silencedUntil < new Date()) {
        await relationRepo.resetToNormal(providerId, consumerHash)
        return { allowed: true }
      }
      // Silenciado: el mensaje se envía pero sin notificación al provider
      return { allowed: true, silenced: true }
    }

    if (relation.status === 'blocked') {
      return {
        allowed: false,
        reason:  'provider_unavailable',
        // Mensaje genérico — no revelar que es un bloqueo personal
        message: 'Este profesional no está disponible para nuevas reservas en este momento',
      }
    }

    return { allowed: true }
  }

  async routeIncomingMessage(
    consumerHash: string,
    providerId: string
  ): Promise<MessageRoute> {
    const permission = await this.canConsumerContact(consumerHash, providerId)

    if (!permission.allowed) {
      throw new ContactNotAllowedError(permission.message)
    }

    if (permission.silenced) {
      return { destination: 'archived', notify: false }
    }

    return { destination: 'inbox', notify: true }
  }
}

interface ContactPermission {
  allowed:   boolean
  silenced?: boolean
  reason?:   string
  message?:  string
}

interface MessageRoute {
  destination: 'inbox' | 'archived'
  notify:      boolean
}
```

---

## Generación del deck con filtros de visibilidad

```typescript
// apps/api/src/modules/discovery/use-cases/GenerateDeck.ts

export class GenerateDeckUseCase {
  async execute(params: GenerateDeckParams): Promise<Provider[]> {
    const { consumerId, consumerHash, vertical, location, limit = 10 } = params

    // Consumer baneado → deck vacío
    const ban = await banRepo.findActive(consumerHash)
    if (ban) return []

    const prefs = await prefsRepo.findByConsumerAndVertical(consumerId, vertical)

    // Providers que han bloqueado a este consumer → excluir del deck
    const blockedByProviders = await relationRepo.findProvidersWhoBlocked(consumerHash)

    const candidates = await providerRepo.findForDeck({
      vertical,
      location,
      radiusMeters: 10_000,
      excludeIds:   [...(prefs?.seenProviderIds ?? []), ...blockedByProviders],
      limit:        limit * 3,
    })

    const scored = candidates
      .map(p => ({ provider: p, score: computeAffinityScore(p, prefs) }))
      .sort((a, b) => b.score - a.score + (Math.random() - 0.5) * 0.1)

    return scored.slice(0, limit).map(s => s.provider)
  }
}

function computeAffinityScore(
  provider: Provider,
  prefs: ConsumerPreferences | null
): number {
  if (!prefs || Object.keys(prefs.attributeWeights).length === 0) {
    return provider.trustScore.overall / 5
  }
  let score = 0, total = 0
  for (const [attr, weights] of Object.entries(prefs.attributeWeights)) {
    const val    = provider.attributes[attr] as string
    const weight = (weights as Record<string, number>)[val] ?? 0.5
    score += weight
    total += 1
  }
  const attrScore  = total > 0 ? score / total : 0.5
  const trustBoost = provider.isVerified ? 0.10 : 0
  const freshBoost = provider.isNew      ? 0.05 : 0
  return attrScore + trustBoost + freshBoost
}
```

---

## Aprendizaje de preferencias (job asíncrono)

```typescript
// workers/ai-pipeline/src/jobs/update-consumer-preferences.ts

export async function updateConsumerPreferences(job: Job): Promise<void> {
  const { consumerId, providerId, signal, vertical } = job.data

  const provider = await providerRepo.findById(providerId)
  const prefs    = await prefsRepo.findOrCreate(consumerId, vertical)

  const learningRate =
    signal === 'super_like' ?  0.30 :
    signal === 'like'       ?  0.15 :
                              -0.10   // pass

  const newWeights = { ...prefs.attributeWeights }
  for (const [attr, value] of Object.entries(provider.attributes)) {
    if (typeof value !== 'string') continue
    if (!newWeights[attr]) newWeights[attr] = {}
    const current = (newWeights[attr] as Record<string, number>)[value] ?? 0.5
    ;(newWeights[attr] as Record<string, number>)[value] =
      Math.max(0, Math.min(1, current + learningRate))
  }

  const isPositive = signal === 'like' || signal === 'super_like'
  await prefsRepo.update(consumerId, vertical, {
    attributeWeights:  newWeights,
    seenProviderIds:   [...new Set([...prefs.seenProviderIds, providerId])],
    likedProviderIds:  isPositive
      ? [...new Set([...prefs.likedProviderIds, providerId])]
      : prefs.likedProviderIds.filter(id => id !== providerId),
  })
}
```

---

## Integración con trust score al bloquear

```typescript
async function blockConsumer(
  providerId: string,
  consumerHash: string,
  dek: Uint8Array,
  options: { reason?: string; contributeToTrustScore: boolean }
): Promise<void> {
  await relationRepo.upsert({
    providerId,
    consumerHash,
    status:     'blocked',
    reasonEnc:  options.reason
                  ? await encryptField(options.reason, dek)
                  : null,
  })

  if (options.contributeToTrustScore) {
    // Contribución anónima — no revela quién bloqueó
    await trustScoreService.contribute(consumerHash, {
      dimension: 'communication',
      rawScore:  1,   // puntuación mínima
    })
  }
}
```

---

## Endpoints

```
# Consumer
GET    /api/v1/discovery/:vertical/deck
POST   /api/v1/discovery/:vertical/swipe          { providerId, signal, positionInDeck? }
GET    /api/v1/discovery/:vertical/liked
DELETE /api/v1/discovery/:vertical/liked/:id
DELETE /api/v1/discovery/:vertical/history

# Provider — gestión de relaciones
GET    /api/v1/me/consumers/restricted
POST   /api/v1/me/consumers/:hash/silence         { durationDays: number | null }
POST   /api/v1/me/consumers/:hash/block           { contributeToTrustScore?: boolean }
POST   /api/v1/me/consumers/:hash/prefer
DELETE /api/v1/me/consumers/:hash/restriction

# Platform admin
POST   /api/v1/admin/bans                         { consumerHash, reason, expiresAt? }
DELETE /api/v1/admin/bans/:consumerHash
GET    /api/v1/admin/bans
```

---

## Tabla de privacidad y asimetría de información

| Acción | Lo sabe el provider | Lo sabe el consumer | Lo sabe la plataforma |
|--------|--------------------|--------------------|----------------------|
| Consumer da like/pass | NO | SÍ | SÍ |
| Consumer da super_like | NO | SÍ | SÍ |
| Provider silencia | SÍ | NO | SÍ |
| Provider bloquea | SÍ | Ve que no puede contactar, no el motivo | SÍ |
| Ban de plataforma | NO | Notificación genérica opcional | SÍ |

La asimetría es intencional: protege al provider de confrontaciones y al consumer de comportamientos reactivos.
