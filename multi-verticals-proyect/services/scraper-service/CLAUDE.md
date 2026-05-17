# CLAUDE.md — services/scraper-service

> ETL: extracción, normalización y carga de datos de fuentes externas.
> Puerto: 3009. Proceso batch — consume jobs de la cola, no recibe requests del gateway.
> Lee también el CLAUDE.md raíz del proyecto antes de trabajar aquí.

---

## Qué es este servicio

Servicio Node.js que extrae datos de Presenters de fuentes externas (páginas de
anuncios, directorios, webs de negocios), los normaliza al schema canónico de cada
vertical, resuelve duplicados, y los carga en la base de datos principal.

Es independiente del flujo de usuarios — escribe en la misma BD pero es un proceso
completamente separado. No comparte código de runtime con otros servicios, solo los
tipos del dominio (`@allcoba/shared-types`).

**Nunca expone un puerto HTTP al gateway.** Se activa por jobs en la cola de
pg-boss (scraping programado) o por jobs manuales desde el panel de admin.

---

## Estructura de carpetas

```text
services/scraper-service/
├── src/
│   ├── index.ts                        ← entry point: suscribe a colas de scraping
│   ├── application/                    ← casos de uso y puertos (SourcePort)
│   ├── domain/                         ← entidades y value objects (Vertical, RawExtraction)
│   ├── infrastructure/
│   │   ├── adapters/
│   │   │   ├── sources/                ← ADAPTADORES (Ver SOURCES.md en esta carpeta)
│   │   │   │   ├── dating/             ← Vertical de Citas (ver DATING-SOURCES.md)
│   │   │   │   ├── motor/              ← Vertical de Automoción
│   │   │   │   ├── real-estate/        ← Vertical Inmobiliaria
│   │   │   │   └── base-source.adapter.ts ← Clase base común
│   │   │   ├── persistence/            ← Drizzle / PostgreSQL
│   │   │   └── queue/                  ← pg-boss
│   │   └── crawler/
│   │       ├── playwright-crawler.ts   ← páginas dinámicas (SPA)
│   │       ├── cheerio-crawler.ts      ← páginas estáticas
│   │       └── robots-checker.ts       ← respeto a robots.txt
│   ├── jobs/                           ← handlers de jobs de la cola
│   └── normalizers/                    ← lógica de mapeo crudo → dominio
└── fixtures/                           ← HTML de ejemplo para tests
```

---

## Reglas éticas y de seguridad

### Siempre respetar robots.txt

```typescript
// src/crawler/robots-checker.ts
import robotsParser from 'robots-parser';

const robotsCache = new Map<string, RobotsParser>();

export async function canCrawl(url: string): Promise<boolean> {
  const { origin } = new URL(url);

  if (!robotsCache.has(origin)) {
    const robotsUrl = `${origin}/robots.txt`;
    const res = await fetch(robotsUrl).catch(() => null);
    const text = res ? await res.text() : '';
    robotsCache.set(origin, robotsParser(robotsUrl, text));
  }

  return robotsCache.get(origin)!.isAllowed(url, 'AllcobaBot') ?? true;
}
```

### Rate limiting ético entre requests

```typescript
// Nunca más de 1 request por segundo al mismo dominio
// Nunca más de 3 dominios en paralelo
const CRAWLER_CONFIG = {
  delayBetweenRequestsMs: 2000,
  maxConcurrentDomains: 3,
  timeoutMs: 10000,
  userAgent: 'AllcobaBot/1.0 (+https://allcoba.com/bot)',
};
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
  /^169\.254\./, // AWS metadata
  /^::1$/, // IPv6 loopback
];

export function assertSafeUrl(url: string): void {
  const { hostname } = new URL(url);
  if (BLOCKED_PATTERNS.some((p) => p.test(hostname))) {
    throw new UnsafeUrlError(`Blocked internal URL: ${url}`);
  }
}
```

---

## Entity Resolution — el algoritmo

El mismo negocio puede aparecer en 3 webs distintas con datos diferentes.
El único campo que suele ser consistente es el teléfono.

```typescript
// src/entity-resolution/resolver.ts

type MatchResult =
  | { matched: true; provider: Provider; confidence: 'high' | 'medium' }
  | { matched: false; confidence: null };

async function resolveEntity(raw: RawProvider, vertical: string): Promise<MatchResult> {
  // 1. Teléfono normalizado — confianza alta (0.95)
  const phone = normalizePhone(raw.phone);
  if (phone) {
    const found = await db.findProviderByPhone(phone, vertical);
    if (found) return { matched: true, provider: found, confidence: 'high' };
  }

  // 2. Dirección + nombre similar — confianza media (0.8)
  if (raw.address) {
    const addr = normalizeAddress(raw.address);
    const candidates = await db.findProvidersByAddress(addr, vertical);
    for (const candidate of candidates) {
      const nameSim = levenshteinSimilarity(raw.name ?? '', candidate.displayName);
      if (nameSim > 0.75) {
        return { matched: true, provider: candidate, confidence: 'medium' };
      }
    }
  }

  return { matched: false, confidence: null };
}

// Merge de datos — NUNCA sobreescribe lo que el Presenter puso manualmente
async function mergeProviderData(existing: Provider, raw: RawProvider): Promise<void> {
  await db.updateProvider(existing.id, {
    bio: existing.bio ?? raw.description,
    addressText: existing.addressText ?? raw.address,
    // Los atributos se mergean — los del Presenter tienen prioridad
    attributes: { ...raw.attributes, ...existing.attributes },
  });
}

function normalizePhone(phone?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('34') && digits.length === 11) return digits.slice(2);
  if (digits.length === 9) return digits;
  return null;
}
```

---

## Extracción con LLM (Llama 3.2 3B via media-service)

Para extraer servicios y precios de texto libre sin estructura,
el scraper publica un job que procesa el media-service (que tiene los modelos IA).

```typescript
// src/enrichment/llm-extractor.ts

async function extractServicesFromText(
  rawText: string,
  vertical: string,
): Promise<ExtractedService[]> {
  // Publicar job — el media-service lo procesa con Llama 3.2 3B
  const jobId = await queue.publish('extract-services-from-text', {
    text: rawText.slice(0, 1000), // truncar siempre
    vertical,
  });

  // Esperar resultado con timeout
  return waitForJobResult(jobId, { timeoutMs: 30000 });
}
```

---

## Descarga y moderación de imágenes

Las imágenes scrapeadas no se moderan aquí — se delega al media-service
via la cola de jobs con prioridad baja.

```typescript
// src/enrichment/image-downloader.ts

async function downloadAndQueueImage(
  imageUrl: string,
  providerId: string,
  vertical: string,
): Promise<void> {
  // 1. Verificar que la URL es segura
  assertSafeUrl(imageUrl);

  // 2. Comprobar pHash antes de descargar (deduplicación)
  const urlHash = sha256(imageUrl);
  if (await mediaRepo.existsBySourceHash(urlHash)) return; // ya descargada

  // 3. Descargar la imagen
  const buffer = await downloadImage(imageUrl);

  // 4. Subir a R2/temp/ directamente (el scraper tiene acceso a R2)
  const tempPath = `temp/scraper/${providerId}/${uuid()}`;
  await r2.put(tempPath, buffer);

  // 5. Publicar job de moderación con PRIORIDAD BAJA
  await queue.publish(
    'moderate-scraper-image',
    {
      tempR2Path: tempPath,
      providerId,
      vertical,
      sourceUrl: imageUrl,
    },
    { priority: 1 },
  ); // prioridad 1 vs 10 del Presenter
}
```

---

## Scheduler de scraping

```typescript
// src/index.ts

async function main() {
  // Scraping diario a las 2am — solo Presenters desactualizados (>30 días)
  await queue.schedule('scrape-stale-providers', '0 2 * * *', {
    staleDays: 30,
    limit: 100,
  });

  // Re-scraping de Presenters recién creados sin fotos (cada 30 min)
  await queue.schedule('scrape-new-providers', '*/30 * * * *', {
    createdAfterDays: 0,
    missingFields: ['images', 'description'],
    limit: 20,
  });

  // Suscribir a jobs manuales (desde panel de admin)
  await queue.work('scrape-provider', { teamSize: 2 }, scrapeProviderJob);
  await queue.work('scrape-vertical', { teamSize: 1 }, scrapeVerticalJob);
  await queue.work('entity-resolution-batch', { teamSize: 1 }, entityResolutionBatchJob);

  logger.info('scraper-service ready');
}
```

---

## Tests — sin red real

```typescript
// test/normalizers/massage.test.ts
// Los tests usan HTML de fixtures locales — nunca hacen requests reales

import { readFileSync } from 'fs';

import { MassageNormalizer } from '../../src/normalizers/by-vertical/massage';

describe('MassageNormalizer', () => {
  it('extrae nombre, teléfono y servicios del HTML de muestra', () => {
    const html = readFileSync('fixtures/massage-sample.html', 'utf-8');
    const result = new MassageNormalizer().normalize(html, 'https://example.com');

    expect(result.name).toBeTruthy();
    expect(result.phone).toMatch(/^\d{9}$/);
    expect(result.services.length).toBeGreaterThan(0);
  });
});

// test/entity-resolution/resolver.test.ts
// Tests con BD real (Testcontainers)
describe('EntityResolver', () => {
  it('detecta duplicado por teléfono con confianza alta', async () => {
    await insertProvider(db, { phone: '612345678', vertical: 'massage' });

    const result = await resolver.resolveEntity({
      phone: '+34 612 345 678', // mismo número, diferente formato
      vertical: 'massage',
    });

    expect(result.matched).toBe(true);
    expect(result.confidence).toBe('high');
  });

  it('no sobreescribe datos que el Presenter puso manualmente', async () => {
    const existing = await insertProvider(db, {
      bio: 'Mi bio original',
      vertical: 'massage',
    });

    await mergeProviderData(existing, { description: 'Bio del scraper' });

    const updated = await db.findProviderById(existing.id);
    expect(updated.bio).toBe('Mi bio original'); // no sobreescrito
  });
});

// test/crawler/ssrf-guard.test.ts
describe('SSRF Guard', () => {
  it('bloquea URLs a red interna', () => {
    expect(() => assertSafeUrl('http://192.168.1.1/datos')).toThrow(UnsafeUrlError);
    expect(() => assertSafeUrl('http://169.254.169.254/metadata')).toThrow(UnsafeUrlError);
    expect(() => assertSafeUrl('http://localhost:5432')).toThrow(UnsafeUrlError);
  });

  it('permite URLs externas legítimas', () => {
    expect(() => assertSafeUrl('https://ejemplo.com/pagina')).not.toThrow();
  });
});
```

---

## Tablas en schema `scraper`

```sql
scraper.sources          -- fuentes configuradas por vertical (URL, tipo, frecuencia)
scraper.raw_extractions  -- datos crudos antes de normalizar (para debugging)
scraper.entity_matches   -- resultado del entity resolution (para auditoría)
scraper.run_log          -- historial de ejecuciones (cuándo, cuántos, errores)
```

---

## Variables de entorno requeridas

```env
PORT=3009
NODE_ENV=production
DATABASE_URL=             # schema scraper + lectura en shared
R2_ACCOUNT_ID=            # para subir imágenes a R2/temp/ directamente
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Límites del crawler (ajustables sin redeployar)
CRAWLER_DELAY_MS=2000
CRAWLER_MAX_CONCURRENT=3
CRAWLER_TIMEOUT_MS=10000

LOG_LEVEL=info
SERVICE_NAME=scraper-service
```

---

## Comandos habituales

```bash
# Desarrollo
pnpm dev

# Scrapear una vertical manualmente (para pruebas)
pnpm scrape -- --vertical=massage --limit=5 --dry-run

# Tests unitarios (sin red, sin BD)
pnpm test:unit

# Tests de integración (con Testcontainers)
pnpm test:integration

# Verificar entity resolution sobre datos reales
pnpm test:resolution -- --vertical=massage
```
