# 13 · Sistema de reputación

> Doble calificación con privacidad diferencial.
> Los providers califican a consumers. Los consumers califican a providers.
> Sin revelar datos personales en ninguna dirección.

---

## Flujo de calificación

```
Conversación completada
        │
        ├─→ Consumer puede calificar al provider (review pública)
        └─→ Provider puede calificar al consumer (contribución privada al trust score)

Cooldown: 24h desde que termina la conversación antes de poder publicar review.
Sólo se puede calificar si hubo interacción verificada (conversación con estado 'completed').
Cada par (consumer, provider) sólo puede calificarse una vez por conversación.
```

---

## Reviews del provider (públicas)

```typescript
interface ProviderReview {
  id: string
  providerId: string
  conversationId: string          // verificación de interacción real
  consumerHash: string            // quién lo deja — no su nombre
  scores: {
    [dimension: string]: 1|2|3|4|5  // dimensiones de la vertical
  }
  comment?: string                // texto libre, máx 500 chars
  isAnonymous: boolean            // el consumer elige si se muestra como "verificado" o anónimo
  createdAt: Date
}

// Lo que se muestra públicamente en la ficha del provider:
interface PublicReview {
  scores: Record<string, number>
  comment?: string
  consumerLabel: 'Cliente verificado' | 'Cliente anónimo'
  createdAt: string               // sólo mes y año, no fecha exacta
}
```

---

## Trust signals del consumer (privados entre providers)

```typescript
// Lo que un provider contribuye al score de un consumer
// El delta se normaliza y se añade ruido diferencial (ε=0.1)
// para que no sea reversible a un provider concreto

interface TrustContribution {
  consumerHash: string
  dimension: 'punctuality' | 'payment' | 'communication'
  rawScore: 1|2|3|4|5
  delta: number    // rawScore normalizado + laplaciano(ε=0.1)
}

function computeDelta(rawScore: number, epsilon: number = 0.1): number {
  const normalized = (rawScore - 1) / 4  // 0.0 a 1.0
  const noise = sampleLaplacian(0, 1 / epsilon)
  return Math.max(0, Math.min(1, normalized + noise))
}

function sampleLaplacian(mu: number, b: number): number {
  const u = Math.random() - 0.5
  return mu - b * Math.sign(u) * Math.log(1 - 2 * Math.abs(u))
}
```

---

## Anti-manipulación

```typescript
// packages/domain/src/reputation/anti-manipulation.ts

interface ReviewValidation {
  conversationExists: boolean          // ¿hubo conversación real?
  conversationCompleted: boolean       // ¿terminó? (no expirada)
  cooldownPassed: boolean              // ¿han pasado 24h?
  notAlreadyReviewed: boolean          // ¿no ha calificado ya esta conversación?
  spikeDetected: boolean               // ¿demasiadas reviews en poco tiempo?
}

// Si spikeDetected = true, la review pasa a revisión manual
// Criterio de spike: >5 reviews del mismo consumer en 24h a un mismo provider
const SPIKE_THRESHOLD = 5
const SPIKE_WINDOW_HOURS = 24
```

---

## Score agregado y visualización

```typescript
// El score global de un provider se recalcula al añadir cada review
// Se guarda en una columna materializada para no calcular en cada lectura

async function recalculateProviderScore(providerId: string): Promise<void> {
  const reviews = await reviewRepo.findByProvider(providerId)

  const dimensions = getVerticalDimensions(provider.verticalId)
  const scores: Record<string, number> = {}

  for (const dim of dimensions) {
    const dimScores = reviews
      .map(r => r.scores[dim.key])
      .filter(Boolean)
    scores[dim.key] = dimScores.length > 0
      ? dimScores.reduce((a, b) => a + b, 0) / dimScores.length
      : 0
  }

  const overall = Object.values(scores).reduce((a, b) => a + b, 0)
                  / Object.values(scores).length

  await providerRepo.updateTrustScore(providerId, { scores, overall, reviewCount: reviews.length })
}
```
