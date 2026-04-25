# 17 · ETL / Scraper

> Stack: **Playwright** (JS rendering) + **Cheerio** (HTML estático) + **pg-boss** (scheduling)
> Proyecto paralelo e independiente. Escribe en la misma BD pero es un proceso separado.

---

## Arquitectura del ETL

```
[Fuentes externas]
  páginas de anuncios, directorios, redes sociales
        │
        ▼
[Crawler]  Playwright (JS) o Cheerio (estático)
        │  datos crudos: { nombre?, teléfono?, dirección?, fotos[], descripción? }
        ▼
[Normalizer]  mapea datos crudos → schema canónico de la vertical
        │  usando LLM ligero para texto libre (Llama 3.2 3B o Groq free tier)
        ▼
[Entity Resolver]  detecta si el provider ya existe en la BD
        │  matching por: teléfono normalizado + dirección fuzzy + nombre similar
        ▼
[Merger]
  ├─ Provider existente → actualiza campos faltantes, no sobreescribe los del provider
  └─ Provider nuevo → crea registro con estado 'pending_verification'
        │
        ▼
[Media Downloader]  descarga imágenes → las envía al pipeline de moderación
        │  deduplicación por pHash antes de descargar
        ▼
[BD principal]  providers + media_assets actualizados
```

---

## Entity Resolution (fusión de duplicados)

El mismo negocio puede aparecer en 3 webs distintas con datos diferentes. El único campo que suele ser consistente es el teléfono.

```typescript
// workers/etl-scraper/src/entity-resolution.ts

interface RawProvider {
  source: string          // URL de origen
  name?: string
  phone?: string
  address?: string
  description?: string
  imageUrls: string[]
  attributes: Record<string, unknown>
}

async function resolveEntity(
  raw: RawProvider,
  vertical: string
): Promise<{ provider: Provider | null; isNew: boolean; confidence: number }> {

  // 1. Normalizar teléfono (eliminar espacios, prefijos, etc.)
  const normalizedPhone = normalizePhone(raw.phone)

  // 2. Buscar por teléfono (alta confianza si coincide)
  if (normalizedPhone) {
    const byPhone = await providerRepo.findByPhone(normalizedPhone, vertical)
    if (byPhone) return { provider: byPhone, isNew: false, confidence: 0.95 }
  }

  // 3. Buscar por dirección normalizada (confianza media)
  if (raw.address) {
    const normalizedAddress = normalizeAddress(raw.address)
    const byAddress = await providerRepo.findByAddress(normalizedAddress, vertical)
    if (byAddress) {
      // Verificar nombre similar con Levenshtein
      const nameSim = levenshteinSimilarity(raw.name ?? '', byAddress.displayName)
      if (nameSim > 0.7) return { provider: byAddress, isNew: false, confidence: 0.8 }
    }
  }

  // 4. No encontrado → es un provider nuevo
  return { provider: null, isNew: true, confidence: 1.0 }
}

function normalizePhone(phone?: string): string | null {
  if (!phone) return null
  // Eliminar todo excepto dígitos, normalizar prefijo español
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('34') && digits.length === 11) return digits.slice(2)
  if (digits.length === 9) return digits
  return null
}
```

---

## Normalización con LLM

Para extraer servicios y precios de texto libre sin estructura:

```typescript
// workers/etl-scraper/src/normalizer.ts

async function extractServicesFromText(
  rawText: string,
  vertical: string
): Promise<ExtractedService[]> {
  const prompt = `
Eres un extractor de datos estructurados para la vertical: ${vertical}.
Dado el siguiente texto de descripción de un negocio, extrae los servicios
y precios que menciona. Responde SOLO con JSON.

Texto:
${rawText.slice(0, 1000)}

Responde con array de: [{name, price_eur, duration_min}]
Si no hay precio, pon null. Si no hay duración, pon null.
`
  const response = await llamaWorker.complete(prompt, { maxTokens: 400, temperature: 0 })
  return parseServicesJSON(response)
}
```

---

## Scheduler de re-scraping

```typescript
// workers/etl-scraper/src/scheduler.ts

// Re-scrapear providers con datos desactualizados (>30 días sin actualizar)
await queue.schedule('scrape-stale-providers', '0 2 * * *', {  // cada día a las 2am
  verticals: ['hairdresser', 'real-estate', 'car'],
  staleDays: 30,
  limit: 100,   // máximo 100 providers por ejecución
})

// Prioridad: providers con pocas fotos o sin descripción
async function getScrapingPriority(providerId: string): Promise<number> {
  const p = await providerRepo.findById(providerId)
  let score = 0
  if (p.mediaIds.length < 2) score += 3
  if (!p.bio || p.bio.length < 50) score += 2
  if (!p.attributes.phone) score += 5  // teléfono es crítico para entity resolution
  return score
}
```

---

## Reglas éticas del scraper

```typescript
// workers/etl-scraper/src/crawler.ts

const CRAWLER_CONFIG = {
  respectRobotsTxt: true,
  defaultDelayMs: 2000,     // 2 segundos entre requests al mismo dominio
  maxConcurrentDomains: 3,  // nunca más de 3 dominios en paralelo
  userAgent: 'MarketplaceBot/1.0 (+https://tudominio.com/bot)',
  timeoutMs: 10000,
}

// SSRF protection — nunca seguir URLs que apunten a red interna
const BLOCKED_HOSTS = [
  'localhost', '127.0.0.1', '0.0.0.0',
  '169.254.169.254',  // AWS metadata
  '10.', '192.168.', '172.16.',
]

function isSafeUrl(url: string): boolean {
  const parsed = new URL(url)
  return !BLOCKED_HOSTS.some(h => parsed.hostname.startsWith(h))
}
```
