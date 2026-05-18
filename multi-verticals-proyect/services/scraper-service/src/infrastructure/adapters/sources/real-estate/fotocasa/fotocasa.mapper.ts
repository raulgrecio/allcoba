/**
 * Fotocasa mapper — FotocasaPayload → ScrapedProperty.
 *
 * Key facts:
 *   - SSR JSON in `window.__INITIAL_DATA__` carries the full ad
 *   - confidence = high (structured JSON, no DOM-scraping ambiguity)
 *   - listingType derived from `transactionTypeId` (1 = sale, 3 = rent)
 *   - city slug from address.locality / municipality
 */

import { asProviderId, i18nFromOriginal } from '@allcoba/shared-types';

import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';
import type { ExternalRef } from '#domain/canonical/external-ref.js';
import type { ScrapedPhoto } from '#domain/canonical/scraped-photo.js';
import type { ScrapedProperty } from '#domain/canonical/scraped-property.js';
import { Confidence } from '#domain/canonical/confidence.js';

import type { FotocasaPayload, FotocasaPhoto } from './fotocasa.types.js';

export const FOTOCASA_SOURCE = 'fotocasa';

export interface FotocasaMapperOptions {
  readonly now?: Date;
  readonly contentLocale?: string;
}

const mapPhoto = (photo: FotocasaPhoto, idx: number): ScrapedPhoto => ({
  id: `fotocasa:photo:${photo.position}`,
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

export const mapFotocasa = async (
  payload: FotocasaPayload,
  resolver: TaxonomyResolverPort,
  options: FotocasaMapperOptions = {},
): Promise<ScrapedProperty> => {
  const now = options.now ?? new Date();
  const contentLocale = options.contentLocale ?? 'es';

  const providerId = asProviderId(`${FOTOCASA_SOURCE}:${payload.sourceId}`);

  const cityRaw = payload.city;
  const citySlug = cityRaw ? slugifyCity(cityRaw) : undefined;
  const cityId = citySlug ? await resolver.resolveCity(citySlug, 'ES') : null;
  const baseCity = cityId ? { id: cityId } : undefined;

  const externalRef: ExternalRef = {
    source: FOTOCASA_SOURCE,
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
    postalCode: payload.postalCode,
    coordinates: payload.coordinates,
    surfaceM2: payload.surfaceM2,
    roomsCount: payload.roomsCount,
    bathroomsCount: payload.bathroomsCount,
    floor: payload.floor,
    buildYear: undefined,
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
    confidence: Confidence.high,
    attributes: {
      agencyName: payload.agencyName,
    },
    metadata: { source: FOTOCASA_SOURCE, adapterVersion: 'v2' },
    lastScrapedAt: now.toISOString(),
  };
};
