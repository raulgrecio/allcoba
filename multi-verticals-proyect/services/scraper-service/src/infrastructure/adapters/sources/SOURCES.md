# SOURCES.md — services/scraper-service/src/infrastructure/adapters/sources

> Sistema de adaptadores para la extracción de datos crudos (HTML/JSON) desde fuentes externas.
> Cada adaptador es un **pipeline v2**: funciones puras que transforman HTML en una
> entidad canónica. El crawler y la persistencia los gestiona el caso de uso.

---

## Arquitectura — pipelines v2

Un adaptador NO crawlea ni persiste. Es un conjunto de funciones puras compuestas
en un objeto `ScrapingPipelinePort`. El flujo:

```text
HTML  ─→  extract()  ─→  <Source>Payload  ─→  map()  ─→  ScrapedProvider | ScrapedListing | …
          (puro)                              (puro, con TaxonomyResolverPort inyectado)
```

`ScrapeUrlUseCase` es dueño del `crawler.fetch(...)`; pasa el HTML a `extract()`.
La persistencia la decide la estrategia registrada para la vertical del pipeline.

### Contratos

- **`ScrapingPipelinePort<TPayload, TScraped>`** (`application/ports/scraping-pipeline.port.ts`)
  — contrato genérico. Aliases por vertical: `RealEstatePipelinePort`, `MotorPipelinePort`,
  `GeneralPipelinePort`.
- **`DatingPipelinePort`** (`application/ports/dating-pipeline.port.ts`) — contrato de dating.

### Clases base (scaffolding compartido)

| Base | Vertical | Salida |
| :--- | :--- | :--- |
| `DatingPipelineBase` | dating | `ScrapedProvider` |
| `GeneralPipelineBase` | general | `ScrapedListing` |

Las bases aportan `extractProfileLinks` / `extractNextPageUrl` / `getCrawlerOptions`
con defaults razonables. El pipeline concreto fija `identifier` + routing de URL.

## Ficheros de un adaptador

```text
sources/<vertical>/<source>/
├── <source>.types.ts       ← <Source>Payload (forma raw del adaptador)
├── <source>.parsers.ts     ← parsers puros (string → valor)
├── <source>.extractor.ts   ← extract(html, sourceUrl) → Payload   (puro)
├── <source>.mapper.ts      ← map(payload, resolver, opts) → entidad canónica  (puro)
└── <source>.pipeline.ts    ← clase que extiende la base v2 y compone lo anterior
```

## Catch-all

`DiscoveryPipeline` (`general/discovery/`) acepta cualquier URL que no matchee un
portal registrado. Extracción genérica (título, descripción, og:image) → `ScrapedListing`
con `confidence: low`.

## Comandos rápidos

```bash
# Tests de una vertical
npx vitest run __tests__/unit/infrastructure/adapters/sources/dating/

# Tests de un adaptador concreto
npx vitest run __tests__/unit/infrastructure/adapters/sources/dating/madrid69/

# Verificar tipos
npx tsc --noEmit
```

## Añadir una nueva fuente

1. Crear la carpeta `sources/<vertical>/<source>/` con los 5 ficheros.
2. El pipeline extiende la base v2 de su vertical.
3. Implementar `canHandle`, `isProfileUrl`, `extract`, `map`.
4. Registrar el pattern de URL en `source.registry.ts`.
5. Tests en `__tests__/unit/infrastructure/adapters/sources/<vertical>/<source>/`.

---

_Detalles específicos de Dating: [DATING-SOURCES.md](./dating/DATING-SOURCES.md)_
