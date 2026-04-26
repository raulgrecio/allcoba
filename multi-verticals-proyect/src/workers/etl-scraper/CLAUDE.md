# CLAUDE.md — workers/etl-scraper

> Contexto específico del worker de scraping y ETL.
> Lee también el CLAUDE.md raíz del proyecto antes de trabajar aquí.

---

## Qué es este proceso

Worker Node.js que extrae datos de providers de fuentes externas (páginas de anuncios, directorios, webs de negocios), los normaliza al schema canónico de cada vertical, resuelve duplicados, y los carga en la base de datos principal.

Es un **proyecto paralelo e independiente** — escribe en la misma BD que la API pero es un proceso completamente separado. No comparte código de runtime con la API, sólo los tipos del dominio (`@marketplace/shared-types`).

Este proceso **nunca expone un puerto HTTP**. Se activa por jobs en la cola de pg-boss (scraping programado) o por jobs manuales desde el panel de admin.

---

## Estructura de carpetas

```
workers/etl-scraper/
├── src/
│   ├── index.ts                       ← entry point: suscribe a colas de scraping
│   ├── crawler/
│   │   ├── playwright-crawler.ts      ← páginas con JavaScript (SPA, JS rendering)
│   │   ├── cheerio-crawler.ts         ← páginas estáticas (más rápido, menos recursos)
│   │   └── robots-checker.ts          ← respetar robots.txt antes de crawlear
│   ├── normalizers/
│   │   ├── base-normalizer.ts         ← interfaz común para todos los normalizadores
│   │   └── by-vertical/
│   │       ├── hairdresser.ts         ← mapea campos crudos → schema peluquería
│   │       ├── real-estate.ts
│   │       └── car.ts
│   ├── entity-resolution/
│   │   ├── resolver.ts                ← detecta si el provider ya existe en BD
│   │   ├── phone-matcher.ts           ← matching por teléfono normalizado
│   │   └── address-matcher.ts        ← fuzzy matching de dirección
│   ├── enrichment/
│   │   ├── llm-extractor.ts           ← extrae servicios/precios de texto libre
│   │   └── image-downloader.ts        ← descarga imágenes → envía a cola de moderación
│   ├── jobs/
│   │   ├── scrape-vertical.ts         ← job: scrapear una vertical completa
│   │   ├── scrape-provider.ts         ← job: actualizar un provider específico
│   │   └── entity-resolution.ts      ← job: resolver duplicados en batch
│   └── sources/
│       ├── source.port.ts             ← interfaz: cada fuente implementa este port
│       └── by-vertical/
│           ├── hairdresser-sources.ts ← lista de URLs/dominios a scrapear
│           └── real-estate-sources.ts
└── fixtures/                          ← HTML de ejemplo para tests (sin red)
    ├── hairdresser-sample.html
    └── real-estate-sample.html
```

---

## Reglas éticas y de seguridad

### Siempre respetar robots.txt

```typescript
// src/crawler/robots-checker.ts
import robotsParser from 'robots-parser'

const robotsCache = new Map<string, RobotsParser>()

export async function canCrawl(url: string): Promise<boolean> {
  const { origin } = new URL(url)
  
  if (!robotsCache.has(origin)) {
    const robotsUrl = `${origin}/robots.txt`
    const res = await fetch(robotsUrl).catch(() => null)
    const text = res ? await res.text() : ''
    robotsCache.set(origin, robotsParser(robotsUrl, text))
  }

  return robotsCache.get(origin)!.isAllowed(url, 'MarketplaceBot') ?? true
}
```

### Rate limiting ético entre requests

```typescript
// Nunca más de 1 request por segundo al mismo dominio
// Nunca más de 3 dominios en paralelo
const CRAWLER_CONFIG = {
  delayBetweenRequestsMs: 2000,    // 2s entre requests al mismo dominio
  maxConcurrentDomains: 3,
  timeoutMs: 10000,
  userAgent: 'MarketplaceBot/1.0 (+https://tudominio.com/bot)',
}
```

### Protección SSRF — nunca seguir URLs a red interna

```typescript
// src/crawler/ssrf-guard.ts
const BLOCKED_PATTERNS = [
  /^localhost/i,
  /^127\./,
  /^0\.0\.0\.0/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,           // AWS metadata
  /^::1$/,                 // IPv6 loopback
]

export function assertSafeUrl(url: string): void {
  const { hostname } = new URL(url)
  if (BLOCKED_PATTERNS.some(p => p.test(hostname))) {
    throw new UnsafeUrlError(`Blocked internal URL: ${url}`)
  }
}
```

---

## Entity Resolution — el algoritmo

```typescript
// src/entity-resolution/resolver.ts

// Confianza del match — decide si merge automático o revisión humana
type MatchResult =
  | { matched: true;  provider: Provider; confidence: 'high' | 'medium' }
  | { matched: false; confidence: null }

async function resolveEntity(raw: RawProvider, vertical: string): Promise<MatchResult> {
  // 1. Teléfono normalizado — confianza alta (0.95)
  const phone = normalizePhone(raw.phone)
  if (phone) {
    const found = await db.findProviderByPhone(phone, vertical)
    if (found) return { matched: true, provider: found, confidence: 'high' }
  }

  // 2. Dirección + nombre similar — confianza media (0.8)
  if (raw.address) {
    const addr = normalizeAddress(raw.address)
    const candidates = await db.findProvidersByAddress(addr, vertical)
    for (const candidate of candidates) {
      const nameSim = levenshteinSimilarity(raw.name ?? '', candidate.displayName)
      if (nameSim > 0.75) return { matched: true, provider: candidate, confidence: 'medium' }
    }
  }

  return { matched: false, confidence: null }
}

// Merge de datos — NUNCA sobreescribe datos que el provider puso manualmente
async function mergeProviderData(existing: Provider, raw: RawProvider): Promise<void> {
  await db.updateProvider(existing.id, {
    // Sólo rellenar campos vacíos — nunca sobreescribir
    bio:         existing.bio        ?? raw.description,
    addressText: existing.addressText ?? raw.address,
    // Los atributos se mergean, no se sobreescriben
    attributes: { ...raw.attributes, ...existing.attributes },
  })
}
```

---

## Extracción con LLM (Llama 3.2 3B)

```typescript
// src/enrichment/llm-extractor.ts
// Mismo worker de IA — se comunica via job queue, no importación directa

async function extractServicesFromText(
  rawText: string,
  vertical: string
): Promise<ExtractedService[]> {
  // Encolar job de extracción — el worker de IA lo procesa
  const jobId = await queue.publish('extract-services-from-text', {
    text: rawText.slice(0, 1000),  // truncar siempre
    vertical,
  })

  // Esperar resultado con timeout
  return waitForJobResult(jobId, { timeoutMs: 30000 })
}
```

---

## Scheduler de scraping

```typescript
// src/index.ts

// Scraping diario a las 2am — sólo providers desactualizados (>30 días)
await queue.schedule('scrape-stale-providers', '0 2 * * *', {
  staleDays: 30,
  limit: 100,
})

// Re-scraping de providers recién creados sin fotos (alta prioridad)
await queue.schedule('scrape-new-providers', '*/30 * * * *', {  // cada 30 min
  createdAfterDays: 0,
  missingFields: ['images', 'description'],
  limit: 20,
})

// Suscribir a jobs manuales desde admin
await queue.work('scrape-provider', { teamSize: 2 }, scrapeProviderJob)
await queue.work('scrape-vertical', { teamSize: 1 }, scrapeVerticalJob)
await queue.work('entity-resolution-batch', { teamSize: 1 }, entityResolutionBatchJob)
```

---

## Tests — sin red real

```typescript
// test/normalizers/hairdresser.test.ts
// Los tests usan HTML de fixtures locales — nunca hacen requests reales

import { readFileSync } from 'fs'
import { HairdresserNormalizer } from '../../src/normalizers/by-vertical/hairdresser'

describe('HairdresserNormalizer', () => {
  it('extrae nombre, teléfono y servicios del HTML de muestra', () => {
    const html = readFileSync('fixtures/hairdresser-sample.html', 'utf-8')
    const result = new HairdresserNormalizer().normalize(html, 'https://example.com')

    expect(result.name).toBe('Salón Ejemplo')
    expect(result.phone).toMatch(/^\d{9}$/)
    expect(result.services.length).toBeGreaterThan(0)
  })
})

// test/entity-resolution/resolver.test.ts
// Tests de entity resolution con BD real (Testcontainers)
describe('EntityResolver', () => {
  it('detecta duplicado por teléfono con confianza alta', async () => {
    await insertProvider(db, { phone: '612345678', vertical: 'hairdresser' })

    const result = await resolver.resolveEntity({
      phone: '+34 612 345 678',  // mismo número, diferente formato
      vertical: 'hairdresser',
    })

    expect(result.matched).toBe(true)
    expect(result.confidence).toBe('high')
  })
})
```

---

## Variables de entorno

```env
DATABASE_URL=postgresql://...

LOG_LEVEL=info
SERVICE_NAME=etl-scraper

# Límites del crawler (ajustables sin redeployar)
CRAWLER_DELAY_MS=2000
CRAWLER_MAX_CONCURRENT=3
CRAWLER_TIMEOUT_MS=10000
```

---

## Comandos habituales

```bash
# Desarrollo
npm run dev

# Scrapear una vertical manualmente (para pruebas)
npm run scrape -- --vertical=hairdresser --limit=5 --dry-run

# Tests unitarios (sin red, sin BD)
npm run test:unit

# Tests de integración (con Testcontainers)
npm run test:integration

# Verificar entity resolution sobre datos reales
npm run test:resolution -- --vertical=hairdresser
```
