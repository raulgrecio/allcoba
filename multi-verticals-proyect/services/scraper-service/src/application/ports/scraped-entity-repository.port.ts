/**
 * ScrapedEntityRepositoryPort — generic externalRef-keyed CRUD for any
 * canonical scraped entity that carries `externalRefs`. One implementation
 * (e.g. `InMemoryScrapedEntityRepository<T>`) serves every vertical whose
 * persistence semantics are "find by external ref → create or overwrite".
 *
 * Dating breaks this mold (multi-criteria find by phone/email/imageHash +
 * priority-aware merge) so `ProviderRepositoryPort` extends this with the
 * extra surface; the generic methods still satisfy the base contract.
 */

import type { ExternalRef, HasExternalRefs } from '#domain/canonical/external-ref.js';
import type { ScrapedListing } from '#domain/canonical/scraped-listing.js';
import type { ScrapedProperty } from '#domain/canonical/scraped-property.js';
import type { ScrapedVehicle } from '#domain/canonical/scraped-vehicle.js';

export interface ScrapedEntityRepositoryPort<T extends HasExternalRefs> {
  findByExternalRef(ref: ExternalRef): Promise<T | null>;
  create(entity: T): Promise<void>;
  update(ref: ExternalRef, entity: T): Promise<void>;
}

export type PropertyRepositoryPort = ScrapedEntityRepositoryPort<ScrapedProperty>;
export type VehicleRepositoryPort = ScrapedEntityRepositoryPort<ScrapedVehicle>;
export type ListingRepositoryPort = ScrapedEntityRepositoryPort<ScrapedListing>;
