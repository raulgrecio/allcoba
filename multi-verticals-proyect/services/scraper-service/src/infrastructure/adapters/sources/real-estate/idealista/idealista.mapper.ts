import { asProviderId, i18nFromOriginal } from '@allcoba/shared-types';

import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';
import type { ExternalRef } from '#domain/canonical/external-ref.js';
import type { ScrapedPhoto } from '#domain/canonical/scraped-photo.js';
import type { ScrapedProperty } from '#domain/canonical/scraped-property.js';
import { Confidence } from '#domain/canonical/confidence.js';

import type { IdealistaPayload, IdealistaPhoto } from './idealista.types.js';

export const IDEALISTA_SOURCE = 'idealista';

export interface IdealistaMapperOptions {
  readonly now?: Date;
  readonly contentLocale?: string;
}

const mapPhoto = (photo: IdealistaPhoto, idx: number): ScrapedPhoto => ({
  id: `idealista:photo:${photo.position}`,
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

export const mapIdealista = async (
  payload: IdealistaPayload,
  resolver: TaxonomyResolverPort,
  options: IdealistaMapperOptions = {},
): Promise<ScrapedProperty> => {
  const now = options.now ?? new Date();
  const contentLocale = options.contentLocale ?? 'es';

  const providerId = asProviderId(`${IDEALISTA_SOURCE}:${payload.sourceId}`);

  const citySlug = payload.city ? slugifyCity(payload.city) : undefined;
  const cityId = citySlug ? await resolver.resolveCity(citySlug, 'ES') : null;
  const baseCity = cityId ? { id: cityId } : undefined;

  const externalRef: ExternalRef = {
    source: IDEALISTA_SOURCE,
    sourceId: payload.sourceId,
    sourceUrl: payload.sourceUrl,
  };

  const photos = payload.photos.map(mapPhoto);

  const addressLabel = [payload.street, payload.neighborhood, payload.city]
    .filter((s): s is string => !!s && s.length > 0)
    .join(', ');

  return {
    id: providerId,
    vertical: 'real-estate',
    listingType: payload.listingType,
    propertyType: payload.propertyType,
    title: payload.title || payload.sourceId,
    description: payload.description
      ? i18nFromOriginal(payload.description, contentLocale)
      : undefined,
    priceAmount: payload.priceAmount,
    currency: 'EUR',
    priceMode: payload.priceMode,
    baseCity,
    addressText: addressLabel ? i18nFromOriginal(addressLabel, contentLocale) : undefined,
    postalCode: undefined,
    coordinates: undefined,
    surfaceM2: payload.surfaceM2,
    roomsCount: payload.roomsCount,
    bathroomsCount: payload.bathroomsCount,
    floor: payload.floor,
    buildYear: payload.buildYear,
    features: {
      hasElevator: payload.hasElevator,
      hasAirConditioning: payload.hasAirConditioning,
      hasHeating: payload.hasHeating,
      hasParking: payload.hasParking,
      hasFurnished: payload.hasFurnished,
      hasTerrace: payload.hasTerrace,
      hasGarden: payload.hasGarden,
      hasPool: payload.hasPool,
      hasStorageRoom: payload.hasStorageRoom,
    },
    energyCertificate:
      payload.energyConsumptionRating || payload.energyEmissionsRating
        ? {
            consumptionRating: payload.energyConsumptionRating,
            emissionsRating: payload.energyEmissionsRating,
          }
        : undefined,
    photos,
    statistics: { photoCount: photos.length },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    externalRefs: [externalRef],
    // DOM-scraping confidence: medium (selectors more fragile than SSR JSON).
    confidence: Confidence.medium,
    attributes: {},
    metadata: { source: IDEALISTA_SOURCE, adapterVersion: 'v2' },
    lastScrapedAt: now.toISOString(),
  };
};
