import type { CurrencyCode } from '@allcoba/shared-types';
import { asProviderId, i18nFromOriginal } from '@allcoba/shared-types';

import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';
import type { ExternalRef } from '#domain/canonical/external-ref.js';
import type { ScrapedListing } from '#domain/canonical/scraped-listing.js';
import type { ScrapedPhoto } from '#domain/canonical/scraped-photo.js';
import { Confidence } from '#domain/canonical/confidence.js';

import type { WallapopPayload, WallapopPhoto } from './wallapop.types.js';

export const WALLAPOP_SOURCE = 'wallapop';

export interface WallapopMapperOptions {
  readonly now?: Date;
  readonly contentLocale?: string;
}

const mapPhoto = (photo: WallapopPhoto, idx: number): ScrapedPhoto => ({
  id: `wallapop:photo:${photo.position}`,
  url: photo.url,
  thumbnail: photo.thumbnail ?? photo.url,
  isPrimary: idx === 0,
  isVerified: false,
  order: idx,
});

const slugifyCity = (raw: string): string =>
  raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

export const mapWallapop = async (
  payload: WallapopPayload,
  resolver: TaxonomyResolverPort,
  options: WallapopMapperOptions = {},
): Promise<ScrapedListing> => {
  const now = options.now ?? new Date();
  const contentLocale = options.contentLocale ?? 'es';

  const providerId = asProviderId(`${WALLAPOP_SOURCE}:${payload.sourceId}`);

  const citySlug = payload.city ? slugifyCity(payload.city) : undefined;
  const cityId = citySlug ? await resolver.resolveCity(citySlug, 'ES') : null;
  const baseCity = cityId ? { id: cityId } : undefined;

  const externalRef: ExternalRef = {
    source: WALLAPOP_SOURCE,
    sourceId: payload.sourceId,
    sourceUrl: payload.sourceUrl,
  };

  const photos = payload.photos.map(mapPhoto);

  return {
    id: providerId,
    vertical: 'general',
    title: payload.title || payload.sourceId,
    description: payload.description
      ? i18nFromOriginal(payload.description, contentLocale)
      : undefined,
    priceAmount: payload.priceAmount,
    currency: (payload.currency ?? 'EUR') as CurrencyCode,
    categoryPath: payload.categoryPath,
    brand: payload.brand,
    model: payload.model,
    condition: payload.condition,
    shipping: payload.shipping,
    baseCity,
    addressText: payload.city ? i18nFromOriginal(payload.city, contentLocale) : undefined,
    postalCode: payload.postalCode,
    coordinates: payload.coordinates,
    photos,
    statistics: {
      photoCount: photos.length,
      views: payload.views,
      favorites: payload.favorites,
    },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    externalRefs: [externalRef],
    confidence: Confidence.high,
    attributes: {},
    metadata: { source: WALLAPOP_SOURCE, adapterVersion: 'v2' },
    lastScrapedAt: now.toISOString(),
  };
};
