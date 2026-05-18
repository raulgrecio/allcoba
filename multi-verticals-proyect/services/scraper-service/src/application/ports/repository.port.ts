import type { Email, ImageHash, PhoneE164, ProviderId, Vertical } from '@allcoba/shared-types';

import type { ScrapedEntityRepositoryPort } from '#application/ports/scraped-entity-repository.port.js';
import type { ExternalRef } from '#domain/canonical/external-ref.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';

export interface ProviderCriteria {
  phoneNumber?: PhoneE164;
  email?: Email;
  externalRef?: ExternalRef;
  imageHash?: ImageHash;
  vertical: Vertical;
}

/**
 * ProviderRepositoryPort — dating-specific repository.
 *
 * Inherits the generic externalRef-keyed CRUD surface from
 * `ScrapedEntityRepositoryPort<ScrapedProvider>` (findByExternalRef / create
 * / update) and adds dating-only concerns:
 *
 *   - `find(criteria)`: multi-key lookup (phone, email, externalRef,
 *     imageHash) required by the consolidation pipeline.
 *   - `findById(id)`: surrogate-key lookup used by review/admin flows.
 *   - `updateById(id, provider)`: replaces a stored record by surrogate id.
 *     Required by the dating consolidation flow, which produces a merged
 *     entity whose target id is already known. Distinct from the inherited
 *     `update(ref, provider)` (which addresses by external reference).
 */
export interface ProviderRepositoryPort
  extends ScrapedEntityRepositoryPort<ScrapedProvider> {
  find(criteria: ProviderCriteria): Promise<ScrapedProvider[]>;
  findById(id: ProviderId): Promise<ScrapedProvider | null>;
  /** Replaces the stored record by surrogate id. Merge with mergeProvider() before calling. */
  updateById(id: ProviderId, provider: ScrapedProvider): Promise<void>;
}
