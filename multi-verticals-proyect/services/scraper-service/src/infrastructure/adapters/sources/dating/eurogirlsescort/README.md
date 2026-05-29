# EuroGirlsEscort adapter — v2 reference

Second v2 adapter port. Follows the same raw → mapper → ScrapedProvider
pipeline established in `topescortbabes/`.

---

## Key difference vs TopEscortBabes

TopEscortBabes embeds `window.profileData` (JSON) in a `<script>` tag.
EuroGirlsEscort is **pure SSR HTML** — the extractor drives Cheerio
selectors and produces a typed `EuroGirlsEscortPayload` directly.

There is no Schema.org `@graph` to prefer. The mapper reads from the
structured `.params` block exclusively.

---

## Files

```
eurogirlsescort/
├── eurogirlsescort.types.ts      ← raw payload model (from Cheerio extraction)
├── eurogirlsescort.parsers.ts    ← pure string parsers
├── eurogirlsescort.extractor.ts  ← HTML → EuroGirlsEscortPayload (pure)
├── eurogirlsescort.mapper.ts     ← payload → ScrapedProvider
└── README.md
```

---

## Pipeline contract

```
HTML  ─→  extractor  ─→  EuroGirlsEscortPayload  ─→  mapper  ─→  ScrapedProvider
                                   │                                    │
                                   ▼                                    ▼
                        RawPayloadRepositoryPort           ProviderRepositoryPort
                          (scraped_raw table)                (scraped_dating table)
```

---

## Source-of-truth preference (mapper)

Single preference layer (no Schema.org):

1. **`.params` block** — Gender, Age, Location href slugs, Height, Weight,
   Nationality, Ethnicity, Hair, Eyes, Orientation, Available for, Meeting with.
2. **Contact block** — phone numbers, WhatsApp flag, encoded dataPhone.
3. **Gallery** — `#js-gallery a.js-gallery[href]` — deduplicated by href.
4. **Rates table** — primary currency + EUR equivalent per row.
5. **Reviews block** — `#reviews-content .item` (empty in sofia fixture).

### Slug derivation

EuroGirlsEscort city/country links are structured:
```html
<a href="/escorts/kuala-lumpur/">Kuala Lumpur</a>
<a href="/escorts/malaysia/">Malaysia</a>
```
→ `locationCitySlug = "kuala-lumpur"`, `locationCountrySlug = "malaysia"`.

Nationality, ethnicity, hair, eyes, orientation are plain text — slugified
via `slugify()` before resolver lookup:
`"Caucasian (white)"` → `"caucasian-white"`.

---

## Tests

```
__tests__/infrastructure/adapters/sources/dating/eurogirlsescort/
├── fixtures/html/
│   └── sofia_1053224.html         ← real HTML capture
├── helpers/
│   ├── fake-taxonomy-resolver.ts  ← deterministic stub
│   └── load-fixtures.ts           ← loadHtmlFixture
├── eurogirlsescort.parsers.test.ts   ← 42 unit tests
├── eurogirlsescort.extractor.test.ts ← 25 unit tests (real HTML + synthetic)
├── eurogirlsescort.mapper.test.ts    ← 36 unit tests (inline payload)
└── eurogirlsescort.pipeline.test.ts  ← 2 integration tests (HTML → ScrapedProvider)
```

**Total: 105 unit tests passing.**

---

## Known issues

- **`ProviderId` ≠ uuid** — mapper emits `eurogirlsescort:<numericId>`. Same
  as topescortbabes: DB integration tests must override with `randomUUID()`.
- **`encodedDataPhone`** — `data-phone="Al-|DQb|I_-|lXl"` obfuscated, cipher
  unknown. Stored as `encodedPhoneNumber` opaquely.
- **`spokenLanguageCodes`** — languages are plain text ("English", "Russian").
  No ISO-639-1 lookup implemented yet; `spokenLanguageCodes` is always `[]`.
- **Services list** — the 30+ services from the HTML table are not yet mapped
  to a canonical field (no `services` on `Profile`). Stored in the raw payload
  only. Consider adding to `sp.attributes` when a canonical field is defined.
