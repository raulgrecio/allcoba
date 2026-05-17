# DEPRECATION — Migración legacy → canonical

> Mapa de equivalencias entre el modelo legacy del scraper
> (`@allcoba/legacy-domain` + `services/scraper-service/src/domain/{value-objects,entities,aggregates}`)
> y el modelo canónico nuevo.
>
> El modelo se divide en dos paquetes según dirección de dependencia:
>
> - **`@allcoba/shared-types`** — dominio puro del marketplace. Importable por
>   cualquier servicio o app. Nunca depende de scraper.
> - **`services/scraper-service/src/domain/canonical/`** — extras scraper-only
>   (ExternalRef, Confidence, ScraperSignal, ProfileImage, ScrapedProvider).
>   Importable solo por el propio scraper. `index.ts` re-exporta shared-types
>   para uso ergonómico desde adapters/use-cases del scraper.

---

## 1. Resumen

| Estado | Acción |
|---|---|
| `@allcoba/legacy-domain` | **Renombrado** desde `@allcoba/domain` en commit `47ef209`. Sigue funcional para no romper compilación durante la migración. |
| `__tests__/` del scraper | **Movido** a `__tests__.legacy/`. Excluido de `vitest.config.ts` e `tsconfig.json`. Se reescriben uno a uno al diseño nuevo. |
| `@allcoba/shared-types` | **Nuevo paquete**. Dominio puro del marketplace (Profile, ReviewCanonical, CityRef, taxonomías, enums, errors, I18nText, PageI18n). Importable por cualquier servicio. |
| `domain/canonical/` | **Nuevo (scraper-only)**. Solo extensiones del scraper: ExternalRef, Confidence, ScraperSignal, ProfileImage, ScrapedProvider. `index.ts` re-exporta shared-types + locals. |
| `domain/value-objects/`, `domain/entities/`, `domain/aggregates/`, `domain/services/` | **Deprecados in-place**. Sin cambios funcionales hasta que el último adapter esté portado, luego se borra todo de golpe. |

### Arquitectura

```
packages/shared-types/src/       ← dominio puro (import desde cualquier sitio)
  identity.ts, i18n-text.ts, enums.ts, geo.ts, taxonomy.ts, price.ts,
  media.ts, personal-details.ts, review.ts, page-i18n.ts, errors.ts,
  profile.ts (Profile pure), index.ts

services/scraper-service/src/domain/canonical/    ← scraper-only
  external-ref.ts    (ExternalRef + helpers)
  confidence.ts      (Confidence + helpers)
  signals.ts         (SignalType + ScraperSignal)
  profile-image.ts   (ProfileImage post-R2)
  scraped-provider.ts (ScrapedProvider = Profile & ScraperMeta + toProfile())
  index.ts           (export * from shared-types + locals)
  DEPRECATION.md     (este archivo)
```

**Regla de dependencia:** shared-types NO importa de ningún servicio.
Scraper importa de shared-types. Otros servicios solo de shared-types.

Criterio de borrado final:

```bash
grep -r "@allcoba/legacy-domain" services/scraper-service/src services/scraper-service/__tests__ | wc -l
# Debe devolver 0 antes de eliminar packages/legacy-domain/.
```

---

## 2. Equivalencias VO → canonical

### 2.1 Value Objects del scraper

| Legacy (`scraper-service/src/domain/value-objects/`) | Canonical | Notas |
|---|---|---|
| `ScrapedLocation` | `CityRef` + `CountryRef` + opcional `addressText: I18nText` | El catálogo geo se normaliza. El free-text de dirección se conserva como I18nText solo cuando la fuente no resuelve a una ciudad conocida. |
| `ScrapedAddress` | `I18nText` (solo si se conserva) o se elimina | En la mayoría de casos basta con `CityRef`. |
| `ExternalId` | `ExternalRef { source, sourceId, sourceUrl?, canonicalId? }` (`identity.ts`) | Mismo contrato semántico. Sin clase `ValueObject` base. Helper `externalRefKey(ref)` reemplaza el getter `.key`. |
| `ConfidenceScore` | `Confidence` branded `number` (`identity.ts`) + objeto `Confidence.{high,medium,low,isHigh,isMedium}` | Mismo rango (0..1). Sin clase. `asConfidence(0.95)` valida en boundary. |
| `Vertical` (enum) | `Vertical` (type union en `enums.ts`) | Renombrado el conjunto: `'dating' \| 'massage' \| 'motor' \| 'real-estate' \| 'general'`. |
| `ContactPlatform` (enum) | `ContactOption` (`enums.ts`) | Mismo concepto: `'calls' \| 'sms' \| 'whatsapp' \| 'telegram'`. |
| `VerificationStatus` (enum) | `ProfileVerificationStatus` (`enums.ts`) | `'pending_review' \| 'verified' \| 'rejected' \| 'expired'`. |

### 2.2 Entities del scraper

| Legacy (`scraper-service/src/domain/entities/`) | Canonical | Notas |
|---|---|---|
| `Provider` | (eliminado — solo era re-export) | `Provider`/`ScrapedProvider` se unifican en `ProfileCanonical`. |
| `ContactPlatform` | `ContactOption` | Ver arriba. |
| `VerificationStatus` | `ProfileVerificationStatus` | Ver arriba. |
| `Vertical` | `Vertical` (type union) | Ver arriba. |

### 2.3 Aggregates del scraper

| Legacy (`scraper-service/src/domain/aggregates/`) | Canonical | Notas |
|---|---|---|
| `ScrapedProvider` (class, immutable, con `merge()`) | `ScrapedProvider` (type) = `Profile & ScraperMeta` en `canonical/scraped-provider.ts`. Profile vive en `@allcoba/shared-types`. `mergeProvider(a, b)` función pura (a crear en `domain/services/canonical/merge-provider.ts`). | El semantic del merge se preserva. `toProfile(sp)` extrae la parte pura para enviar a otros servicios. |
| `CreateScrapedProviderProps`, `MergeProps`, `ScrapedProviderState` | Eliminados | Reemplazados por `ScrapedProvider` directo + `Partial<ScrapedProvider>` para merges. |
| `SocialContact { platform, handle }` | (sin equivalente directo aún) | Pendiente: añadir `contacts: { platform, handle }[]` a `Profile` (shared-types) si lo necesita algún adapter. Decidir al portar el primer adapter. |
| `ScraperSignal` (interface) | `ScraperSignal` en `canonical/signals.ts` (scraper-only) | `confidence: number` → `confidence: Confidence`. `createdAt: Date` → `createdAt: IsoDateTime`. |
| `ScrapedImage` (interface) | `ProfileImage` en `canonical/profile-image.ts` (scraper-only) | Renombrado para evitar colisión con `PhotoCanonical`. Misma forma. |
| `SignalType` (literal union) | `SignalType` en `canonical/signals.ts` (scraper-only) | Sin cambios. |

### 2.4 Services del scraper

| Legacy (`scraper-service/src/domain/services/`) | Canonical | Notas |
|---|---|---|
| `consolidation.service.ts` | `domain/services/canonical/consolidation.service.ts` (a portar) | Misma responsabilidad: dada una lista de signals + provider existente, devuelve un `ProfileCanonical` consolidado. Firma cambia de `ScrapedProvider` → `ProfileCanonical`. |

---

## 3. Equivalencias `@allcoba/legacy-domain` (paquete cross-service legacy)

> Cada entrada aplica **solo dentro de `scraper-service`**. El paquete legacy
> sigue existiendo y otros servicios (auth, media, etc.) pueden seguir usándolo
> si lo importan — ninguno lo hace hoy (verificado con `grep -rl "@allcoba/legacy-domain"`).

### 3.1 Value Objects

Origen reemplazo: salvo nota, todo lo siguiente vive en `@allcoba/shared-types`.

| Legacy (`packages/legacy-domain/src/value-objects/`) | Canonical | Acción para scraper |
|---|---|---|
| `Phone` | `PhoneE164` branded `string` (`personal-details.ts` en shared-types) + `normalizePhone(raw)` puro (a portar de `normalizePhone()` actual) | Adapter llama al normalizer, branded type se construye con `asPhoneE164()`. Sin clase. |
| `Email` | `Email` branded `string` (`personal-details.ts` en shared-types) + `asEmail()` | Validación con Zod en el adapter, no en VO. |
| `Price` | `PriceCanonical { slot, amount, currency }` (`price.ts` en shared-types) | Estructura nueva: añade `slot` (PriceSlot) y separa `amount` de `currency`. |
| `City` | `CityRef { id, slug, countryId, lat?, lng? }` (`geo.ts` en shared-types) | Catálogo normalizado. Nombre traducido vive en `entity_translations`. |
| `Address` | `addressText: I18nText` o se omite si hay `CityRef` | La mayoría de adapters solo necesitan ciudad — `Address` se elimina como concepto. |
| `Street`, `PostalCode` | (sin uso en scraper) | No se portan. |
| `URL` | `string` (validación con Zod si crítico) | TypeScript `string` + schema en boundary. |
| `Telegram` | `string` (validación con Zod) | Mismo enfoque. |
| `ImageHash` | `ImageHash` branded `string` (`media.ts` en shared-types) + `asImageHash()` | Sin cambios funcionales. |
| `ProviderId` | `ProviderId` branded `string` (`identity.ts` en shared-types) + `asProviderId()` | Sin método `generate()` — el adapter recibe id de la fuente o lo crea con `crypto.randomUUID()` antes de envolverlo. |
| `UserId` | (sin uso en scraper) | No se porta. |
| `Id` base, `ValueObject` base | Eliminados | Sustituidos por branded types y interfaces planas. |
| `Coordinates` | `GeoPoint { lat, lng }` (`geo.ts` en shared-types) + `isValidGeoPoint()` | Validación pura. |
| `ExternalId` (también legacy en scraper) | `ExternalRef { source, sourceId, sourceUrl?, canonicalId? }` (`canonical/external-ref.ts` — **scraper-only**) | Conserva el concepto, sin `ValueObject` base. |
| `ConfidenceScore` (legacy scraper) | `Confidence` branded (`canonical/confidence.ts` — **scraper-only**) | Mismo rango 0..1. |

### 3.2 Shared

| Legacy (`packages/legacy-domain/src/shared/`) | Canonical | Acción |
|---|---|---|
| `CountryCode` | `Iso2Code` branded `string` (`enums.ts`) + `asIso2()` (normaliza a upper) | Sin clase. |
| `CurrencyCode` | `CurrencyCode` type union (`enums.ts`) | Type union explícita. |
| `ValidationResult<T>`, `failOne`, `ok` | `Result<T, DomainError>` + `ok()`, `err()`, `isOk()`, `isErr()`, `mapResult()`, `unwrap()` en `errors.ts` | Mismo concepto, firmas más ligeras. Para errores de validación de schema, usar `Schema.safeParse()` de Zod directamente — devuelve la misma forma `{ success, data \| error }`. |

### 3.3 Errors

| Legacy (`packages/legacy-domain/src/errors/`) | Canonical | Acción |
|---|---|---|
| `BaseError` y derivados | `DomainError` abstract + subclases tipadas (`errors.ts`): `InvalidPayloadError`, `EntityNotResolvedError`, `MergeConflictError`, `CanonicalFieldError`, `FormatError` | Nueva taxonomía orientada al pipeline canónico. Las subclases legacy específicas (si las hay) se renombran al portar el código que las usa. |

---

## 4. Patrón de portado

Para cada archivo del scraper que importa `@allcoba/legacy-domain`:

1. **Identificar** los símbolos importados.
2. **Sustituir** import por equivalente canónico.
   - Tipos puros del dominio → `import { … } from '@allcoba/shared-types';`
   - Extras scraper (ExternalRef, Confidence, ScraperSignal, ScrapedProvider) → `import { … } from '../../domain/canonical/index.js';` (o ruta relativa según ubicación).
   - **Recomendado**: importar todo desde `'../../domain/canonical/index.js'` que re-exporta ambos. Reduce el ruido de imports.
3. **Adaptar** llamadas:
   - `VO.create(...)` → `Schema.safeParse(...)` o factory `asX()`.
   - `vo.equals(other)` → helper `xEquals(a, b)`.
   - `vo.toJSON()` → el objeto ya es JSON-compatible.
4. **Mover** validaciones de invariantes al boundary (adapter), no en la entidad.
5. **Eliminar** importaciones obsoletas.
6. **Typecheck** del archivo.
7. **Test** del archivo (reescribir su `*.spec.ts` desde `__tests__.legacy/` al diseño nuevo).
8. **Commit** por archivo o por bloque coherente.

---

## 5. Orden recomendado de portado (PASO 4)

1. `domain/services/canonical/merge-provider.ts` — función pura de merge sobre `ScrapedProvider`.
2. `domain/services/canonical/consolidation.service.ts` — porta `consolidation.service.ts`.
3. `application/ports/repository.port.ts` — sustituye legacy por `ScrapedProvider` (scraper-side) y/o `Profile` (cuando se envía a otros servicios).
4. `infrastructure/adapters/persistence/in-memory-provider.repository.ts` — primer repo (fácil).
5. `infrastructure/adapters/persistence/json-file-provider.repository.ts`.
6. `infrastructure/adapters/persistence/drizzle-provider.repository.ts` — añadir tablas `entity_translations`, `enum_labels`, `catalog_*` en schema Drizzle.
7. `infrastructure/adapters/sources/base-source.adapter.ts` — clase base con `parse(raw) → Normalized`.
8. `infrastructure/adapters/sources/dating/topescortbabes.adapter.ts` — primer adapter rico (referencia v2).
9. Resto de adapters de dating (13 archivos) — patrón establecido.
10. Adapters de `motor/`, `real-estate/`, `general/`.
11. `application/use-cases/scrape-url.use-case.ts`.
12. Reactivar tests uno a uno desde `__tests__.legacy/` → `__tests__/`, reescribiendo al diseño nuevo.

---

## 6. Reglas durante la transición

- **No mezclar** imports legacy y canonical en el mismo archivo. Un archivo
  se considera "portado" cuando 100% de sus imports son del nuevo modelo.
- **No introducir** nuevos imports de `@allcoba/legacy-domain` en archivos
  nuevos. Solo se permite en código ya existente pendiente de portar.
- **Tests legacy** (`__tests__.legacy/`) no se editan. Si fallan, se ignoran
  (están excluidos del runner). Se reescriben al portar.
- **Commits atómicos** por archivo portado, mensaje:
  `refactor(scraper): port <file> from legacy-domain to canonical`.

---

## 7. Limpieza final (PASO 5)

Cuando el grep dé 0:

```bash
# 1. Borrar paquete legacy
rm -rf packages/legacy-domain

# 2. Sacar del workspace (editar pnpm-workspace.yaml si referenciaba explícito)
pnpm install   # re-link

# 3. Borrar tests legacy
rm -rf services/scraper-service/__tests__.legacy

# 4. Borrar carpetas legacy del scraper
rm -rf services/scraper-service/src/domain/value-objects
rm -rf services/scraper-service/src/domain/aggregates
rm services/scraper-service/src/domain/entities/contact-platform.ts
rm services/scraper-service/src/domain/entities/verification-status.ts
rm services/scraper-service/src/domain/entities/vertical.ts
rm services/scraper-service/src/domain/entities/provider.ts
# 'domain/services/consolidation.service.ts' ya estará portado a
# 'domain/services/canonical/consolidation.service.ts' — borrar el viejo:
rm services/scraper-service/src/domain/services/consolidation.service.ts

# 5. Limpiar tsconfig.json — quitar exclude de __tests__.legacy
# 6. Limpiar vitest.config.ts — quitar exclude de __tests__.legacy
# 7. Commit: chore(scraper): remove legacy domain after canonical migration
```
