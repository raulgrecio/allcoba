# TopEscortBabes adapter — v2 reference

Reference implementation of the **raw → mapper → ScrapedProvider** pipeline.
Use this as the template when porting the remaining adapters.

---

## Files

```
topescortbabes/
├── topescortbabes.types.ts       ← raw payload model (extracted from window.profileData)
├── topescortbabes.extractor.ts   ← HTML → TopEscortBabesPayload (pure)
├── topescortbabes.parsers.ts     ← string/html/date parsers (pure, no I/O)
├── topescortbabes.mapper.ts      ← TopEscortBabesPayload → ScrapedProvider (depends on TaxonomyResolverPort)
└── README.md
```

Adapter root (`topescortbabes.adapter.ts`, legacy) stays one level up until
the use-case layer is rewired to orchestrate `extractor → save raw → mapper → save canonical`.

---

## Pipeline contract

```
HTML  ─→  extractor  ─→  TopEscortBabesPayload  ─→  mapper  ─→  ScrapedProvider
                                  │                                    │
                                  ▼                                    ▼
                       RawPayloadRepositoryPort           ProviderRepositoryPort
                         (scraped_raw table)                (scraped_dating table)
```

Two persistence stages. Rationale:

- Scraping is expensive (Cloudflare, Patchright, proxy). The raw store lets us
  re-map after the canonical model evolves, without re-scraping.
- The mapper is pure and synchronous-from-DB. Its only async dependency is
  `TaxonomyResolverPort` (slug → branded id). Tests inject a `FakeTaxonomyResolver`.
- The canonical store (`ProviderRepositoryPort`) consumes the merged
  `ScrapedProvider`, never the raw shape.

---

## Source-of-truth preference (mapper)

For any single canonical field, the mapper picks in this order:

1. **`pageSchema."@graph"` (Schema.org)** — `Person.height`, `Person.weight`,
   `Person.knowsLanguage[]`, `Person.gender`. Most stable, internationally clean.
2. **Root payload fields** — `age`, `nickname`, `prices[]`, `photos[]`,
   `mainMedia`, `badges`, `meetingPlaces`.
3. **`personalDetails.*` HTML fallback** — strip `<a href>` and read the SEO
   slug suffix (`*-nationality`, `*-ethnic`, `*-hair`, `*-eyes`, `*-sexuality`).

---

## Tests (mirror `src/` layout under `__tests__/`)

```
__tests__/infrastructure/adapters/sources/dating/topescortbabes/
├── fixtures/
│   ├── topescortbabes_*.json        ← 51 raw payloads (mapper unit fixtures)
│   └── html/
│       ├── lera.html                ← real HTML captures (extractor/pipeline)
│       └── luna.html
├── helpers/
│   ├── fake-taxonomy-resolver.ts    ← deterministic stub for TaxonomyResolverPort
│   └── load-fixtures.ts             ← loadFixture / loadAllFixtures / loadHtmlFixture
├── topescortbabes.parsers.test.ts   ← unit: stripHtml, slugs, dates, gender
├── topescortbabes.extractor.test.ts ← unit: HTML → raw (synthetic + real captures)
├── topescortbabes.mapper.test.ts    ← unit: raw → ScrapedProvider, 51 fixture loop, taxonomy misses
└── topescortbabes.pipeline.test.ts  ← integration: extractor + mapper on real HTML
```

Counts at writing time: **105 unit tests + 9 PG integration tests = 114 passing.**

---

## Porting checklist for the next adapter

1. Capture 2-3 real HTML profiles in `fixtures/html/`.
2. Extract one raw payload per HTML (run the extractor manually, save the JSON).
3. Define `<source>.types.ts` from the captured payloads (use 30-50 samples
   to catch every variant — see how the 51 fixtures of TEB cover edge cases
   like `ratings: null`, empty `tours[]`, AED/GBP currency).
4. Implement `<source>.extractor.ts` (one HTML capture is enough for a passing
   test; structure is identical to TopEscortBabes if the site uses an embedded
   JSON pattern).
5. Implement `<source>.parsers.ts` — reuse `stripHtml`, `parseHumanDateEs`,
   `parseRelativeTimeEs`, `normalizeContactOption`, `labelToPriceSlot`,
   `parseMeetingWith`, `normalizeGender` from TopEscortBabes when applicable.
   Add `<source>`-specific parsers next to them.
6. Write `<source>.mapper.ts` with the same source-of-truth preference order.
   Reuse `FakeTaxonomyResolver` for tests.
7. Mirror the 4-test layout: parsers / extractor / mapper / pipeline.
8. Add 1 integration test in `__tests__/infrastructure/adapters/persistence/`
   that runs the mapper over 1-2 fixtures and round-trips through Drizzle.

---

## Known issues (TODO)

- **`ProviderId` ≠ `uuid`**. Mapper emits `<source>:<numericId>`. Schema
  expects uuid. Integration test patches with `randomUUID()`. Decide between:
  - Change schema column to `text` and accept source-derived ids.
  - Add an id-normalization step before persistence.
- **`encodedPhoneNumber` / `encodedTelegram`** — observed cipher not yet
  reversed. Currently mapped as opaque strings to `Profile.encoded*`.
- **`tours[]`** — empty in all 51 fixtures. The shape is speculative; revisit
  when a profile with tours is captured.
