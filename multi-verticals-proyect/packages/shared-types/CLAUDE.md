# CLAUDE.md — @allcoba/shared-types

> Pure domain types shared across services. No infrastructure. No scraper-specific concepts.
>
> Reads the root project CLAUDE.md before working here.

## Purpose

Cross-service contracts: the canonical shape of profiles, reviews, geo refs,
taxonomies, prices, media, page i18n, errors. Every service that needs to
exchange these structures imports from here.

Pattern reference: `external/temporal/topescortbabes/types/I18N-MODEL.md`.

## What lives here

- Branded id types (`ProviderId`, `CityId`, `EntityId`, …)
- `I18nText` primitive + helpers
- Geo refs (`CityRef`, `CountryRef`, `GeoPoint`)
- Taxonomy refs (`NationalityRef`, `EthnicRef`, `HairRef`, `EyeRef`, `OrientationRef`)
- Closed-vocabulary enum types (`Vertical`, `Category`, `ContactOption`, `PriceSlot`, `HairColor`, …)
- `Profile` (pure, no scraper metadata)
- `ReviewCanonical`, `PhotoCanonical`, `PriceCanonical`, `PersonalDetailsCanonical`
- `PageI18n`, `FaqCanonical`, `BreadcrumbCanonical`, `MoreLinkCanonical`
- `DomainError` base + subclasses, `Result<T, E>` helpers

## What does NOT live here

- ExternalRef, Confidence, ScraperSignal, ProfileImage, ScrapedProvider — those
  are scraper-only and live in `services/scraper-service/src/domain/canonical/`.
- Persistence-bound types (Drizzle schemas, repos).
- Validation schemas (Zod) — each consuming service defines its own at boundary.

## Direction of dependency

```
@allcoba/shared-types  ←  scraper-service (extends Profile with ScraperMeta)
@allcoba/shared-types  ←  matching-service (consumes Profile to build deck)
@allcoba/shared-types  ←  search-service   (indexes Profile)
@allcoba/shared-types  ←  api-gateway      (forwards Profile to web client)
```

Nothing here imports from any service. Bidirectional dependency is forbidden.
