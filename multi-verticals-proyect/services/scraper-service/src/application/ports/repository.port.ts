import type { Email, ImageHash, Phone, ProviderId } from '@allcoba/legacy-domain';

import type { ScrapedProvider } from '#domain/aggregates/scraped-provider.aggregate.js';
import type { ContactPlatform } from '#domain/entities/contact-platform.js';
import type { Vertical } from '#domain/entities/vertical.js';
import type { ExternalId } from '#domain/value-objects/external-id.vo.js';

export interface ProviderCriteria {
  phone?: Phone;
  email?: Email;
  contact?: { platform: ContactPlatform; handle: string };
  externalId?: ExternalId;
  imageHash?: ImageHash;
  vertical: Vertical;
}

export interface ProviderRepositoryPort {
  find(criteria: ProviderCriteria): Promise<ScrapedProvider[]>;
  create(provider: ScrapedProvider): Promise<void>;
  /** Replaces the stored aggregate with the new version (use ScrapedProvider.merge() first). */
  update(id: ProviderId, provider: ScrapedProvider): Promise<void>;
  findById(id: ProviderId): Promise<ScrapedProvider | null>;
}
