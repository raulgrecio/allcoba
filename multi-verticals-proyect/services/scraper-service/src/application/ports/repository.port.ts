import type { Email, ImageHash, PhoneE164, ProviderId, Vertical } from '@allcoba/shared-types';

import type { ExternalRef } from '#domain/canonical/external-ref.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';

export interface ProviderCriteria {
  phoneNumber?: PhoneE164;
  email?: Email;
  externalRef?: ExternalRef;
  imageHash?: ImageHash;
  vertical: Vertical;
}

export interface ProviderRepositoryPort {
  find(criteria: ProviderCriteria): Promise<ScrapedProvider[]>;
  create(provider: ScrapedProvider): Promise<void>;
  /** Replaces the stored record. Merge with mergeProvider() before calling. */
  update(id: ProviderId, provider: ScrapedProvider): Promise<void>;
  findById(id: ProviderId): Promise<ScrapedProvider | null>;
}
