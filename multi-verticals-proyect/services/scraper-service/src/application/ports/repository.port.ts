import type { ImageHash, Phone, ProviderId, Telegram } from '@allcoba/domain';

import type { ScrapedProvider } from '../../domain/aggregates/scraped-provider.aggregate.js';
import type { Vertical } from '../../domain/entities/vertical.js';
import type { ExternalId } from '../../domain/value-objects/external-id.vo.js';

export interface ProviderCriteria {
  phone?: Phone;
  telegram?: Telegram;
  externalId?: ExternalId;
  imageHash?: ImageHash;
  vertical?: Vertical;
}

export interface ProviderRepositoryPort {
  find(criteria: ProviderCriteria): Promise<ScrapedProvider[]>;
  create(provider: ScrapedProvider): Promise<void>;
  /** Replaces the stored aggregate with the new version (use ScrapedProvider.merge() first). */
  update(id: ProviderId, provider: ScrapedProvider): Promise<void>;
  findById(id: ProviderId): Promise<ScrapedProvider | null>;
}
