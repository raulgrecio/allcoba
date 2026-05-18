/**
 * scraper-service canonical model — barrel.
 *
 * Re-exports `@allcoba/shared-types` (pure domain) plus the scraper-only
 * extensions defined locally. Adapters and use cases inside scraper-service
 * import from here; they should not need a direct import from
 * `@allcoba/shared-types` in practice.
 *
 * See `./DEPRECATION.md` for the migration plan and the legacy ↔ canonical map.
 * See `../../../../../packages/shared-types/CLAUDE.md` for the dependency rule:
 * shared-types may not import from any service.
 */

// Pure domain — owned by @allcoba/shared-types.
export * from '@allcoba/shared-types';

// Scraper-only extensions.
export * from './external-ref.js';
export * from './confidence.js';
export * from './signals.js';
export * from './profile-image.js';
export * from './scraped-listing.js';
export * from './scraped-property.js';
export * from './scraped-provider.js';
export * from './scraped-vehicle.js';
export * from './phone.js';
