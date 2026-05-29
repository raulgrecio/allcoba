/**
 * discovery mapper — DiscoveryPayload → ScrapedListing (pure, async).
 *
 * confidence = low: el catch-all no conoce la estructura del sitio, los datos
 * son best-effort y deben revisarse antes de promocionarse.
 */

import { asProviderId, i18nFromOriginal } from '@allcoba/shared-types';

import type { PipelineMapOptions } from '#application/ports/scraping-pipeline.port.js';
import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';
import type { ExternalRef } from '#domain/canonical/external-ref.js';
import type { ScrapedListing } from '#domain/canonical/scraped-listing.js';
import type { ScrapedPhoto } from '#domain/canonical/scraped-photo.js';
import { Confidence } from '#domain/canonical/confidence.js';

import type { DiscoveryPayload, DiscoveryPhoto } from './discovery.types.js';

export const DISCOVERY_SOURCE = 'discovery';

const mapPhoto = (photo: DiscoveryPhoto, idx: number): ScrapedPhoto => ({
  id: `discovery:photo:${idx}`,
  url: photo.url,
  thumbnail: photo.url,
  isPrimary: idx === 0,
  isVerified: false,
  order: idx,
});

export const mapDiscovery = async (
  payload: DiscoveryPayload,
  _resolver: TaxonomyResolverPort,
  options: PipelineMapOptions = {},
): Promise<ScrapedListing> => {
  const now = options.now ?? new Date();
  const contentLocale = options.contentLocale ?? 'es';

  const externalRef: ExternalRef = {
    source: DISCOVERY_SOURCE,
    sourceId: payload.sourceId,
    sourceUrl: payload.sourceUrl,
  };

  const photos = payload.photos.map(mapPhoto);

  return {
    id: asProviderId(`${DISCOVERY_SOURCE}:${payload.sourceId}`),
    vertical: 'general',
    title: payload.title || payload.sourceId,
    description: payload.description
      ? i18nFromOriginal(payload.description, contentLocale)
      : undefined,
    categoryPath: [],
    photos,
    statistics: { photoCount: photos.length },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    externalRefs: [externalRef],
    confidence: Confidence.low,
    attributes: { isDiscovery: true },
    metadata: { source: DISCOVERY_SOURCE, adapterVersion: 'v2' },
    lastScrapedAt: now.toISOString(),
  };
};
