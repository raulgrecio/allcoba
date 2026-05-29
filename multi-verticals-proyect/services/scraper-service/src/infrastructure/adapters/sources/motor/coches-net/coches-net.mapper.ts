import { asProviderId, i18nFromOriginal } from '@allcoba/shared-types';

import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';
import type { ExternalRef } from '#domain/canonical/external-ref.js';
import type { ScrapedPhoto } from '#domain/canonical/scraped-photo.js';
import type { ScrapedVehicle } from '#domain/canonical/scraped-vehicle.js';
import { Confidence } from '#domain/canonical/confidence.js';

import type { CochesNetPayload, CochesNetPhoto } from './coches-net.types.js';

export const COCHES_NET_SOURCE = 'coches-net';

export interface CochesNetMapperOptions {
  readonly now?: Date;
  readonly contentLocale?: string;
}

const mapPhoto = (photo: CochesNetPhoto, idx: number): ScrapedPhoto => ({
  id: `coches-net:photo:${photo.position}`,
  url: photo.url,
  thumbnail: photo.url,
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

export const mapCochesNet = async (
  payload: CochesNetPayload,
  resolver: TaxonomyResolverPort,
  options: CochesNetMapperOptions = {},
): Promise<ScrapedVehicle> => {
  const now = options.now ?? new Date();
  const contentLocale = options.contentLocale ?? 'es';

  const providerId = asProviderId(`${COCHES_NET_SOURCE}:${payload.sourceId}`);

  const citySlug = payload.province ? slugifyCity(payload.province) : undefined;
  const cityId = citySlug ? await resolver.resolveCity(citySlug, 'ES') : null;
  const baseCity = cityId ? { id: cityId } : undefined;

  const externalRef: ExternalRef = {
    source: COCHES_NET_SOURCE,
    sourceId: payload.sourceId,
    sourceUrl: payload.sourceUrl,
  };

  const photos = payload.photos.map(mapPhoto);

  return {
    id: providerId,
    vertical: 'motor',
    title: payload.title || payload.sourceId,
    description: payload.description
      ? i18nFromOriginal(payload.description, contentLocale)
      : undefined,
    priceAmount: payload.priceAmount,
    currency: 'EUR',
    make: payload.make,
    model: payload.model,
    version: payload.version,
    year: payload.year,
    kilometers: payload.kilometers,
    fuelType: payload.fuelType,
    transmission: payload.transmission,
    bodyType: payload.bodyType,
    color: payload.color,
    condition: payload.condition,
    environmentalLabel: payload.environmentalLabel,
    baseCity,
    addressText: payload.province ? i18nFromOriginal(payload.province, contentLocale) : undefined,
    coordinates: undefined,
    photos,
    statistics: { photoCount: photos.length, videoCount: 0 },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    externalRefs: [externalRef],
    confidence: Confidence.high,
    attributes: {
      isProfessional: payload.isProfessional,
      warrantyMonths: payload.warrantyMonths,
      hasOfficialWarranty: payload.hasOfficialWarranty,
    },
    metadata: { source: COCHES_NET_SOURCE, adapterVersion: 'v2' },
    lastScrapedAt: now.toISOString(),
  };
};
