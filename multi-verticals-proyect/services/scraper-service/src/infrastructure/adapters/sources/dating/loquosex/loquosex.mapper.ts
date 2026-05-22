/**
 * Loquosex mapper — LoquosexPayload → ScrapedProvider (pure, async).
 *
 * Key differences vs other adapters:
 *   - No hair/eye/weight/measurements (not on profiles)
 *   - Services stored as {name,included} in attributes.services
 *   - Price min in attributes.priceMin
 *   - Meeting places inferred from bio text
 *   - isPremium badge tracked in badges / attributes
 *   - sourceId = phone number (same as call phone)
 */

import {
  asPhoneE164,
  asProviderId,
  type PersonalDetailsCanonical,
  type PriceCanonical,
  type ProfileVerificationStatus,
  i18nFromOriginal,
} from '@allcoba/shared-types';

import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';
import type { ExternalRef } from '#domain/canonical/external-ref.js';
import type { ScrapedPhoto } from '#domain/canonical/scraped-photo.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';
import { Confidence } from '#domain/canonical/confidence.js';

import {
  parseLoquosexAge,
  parseLoquosexMeetingPlaces,
  parseLoquosexMinPrice,
  slugifyLoquosex,
} from './loquosex.parsers.js';
import type { LoquosexPayload } from './loquosex.types.js';

export const LOQUOSEX_SOURCE = 'loquosex';

export interface MapperOptions {
  readonly now?: Date;
  readonly contentLocale?: string;
}

// ============================================================================
// Photos
// ============================================================================

const mapPhoto = (photo: LoquosexPayload['photos'][number], idx: number): ScrapedPhoto => ({
  id: `loquosex:photo:${idx}`,
  url: photo.src,
  thumbnail: photo.src,
  isPrimary: idx === 0,
  isVerified: false,
  order: idx,
});

// ============================================================================
// PersonalDetails
// ============================================================================

const mapPersonalDetails = async (
  payload: LoquosexPayload,
  resolver: TaxonomyResolverPort,
): Promise<PersonalDetailsCanonical> => {
  const p = payload.params;

  const nationalitySlug = slugifyLoquosex(p.nationality);
  const nationalityId = nationalitySlug ? await resolver.resolveNationality(nationalitySlug) : null;

  return {
    ageYears: parseLoquosexAge(p.age) ?? 0,
    nationalityId: nationalityId ?? undefined,
    spokenLanguageCodes: [],
    meetingWith: [],
  };
};

// ============================================================================
// Entry point
// ============================================================================

export const mapLoquosex = async (
  payload: LoquosexPayload,
  resolver: TaxonomyResolverPort,
  options: MapperOptions = {},
): Promise<ScrapedProvider> => {
  const now = options.now ?? new Date();
  const contentLocale = options.contentLocale ?? 'es';

  const providerId = asProviderId(`${LOQUOSEX_SOURCE}:${payload.sourceId}`);

  const citySlug = slugifyLoquosex(payload.params.city);
  const cityId = citySlug ? await resolver.resolveCity(citySlug, 'ES') : null;
  const baseCity = cityId ? { id: cityId } : undefined;

  const verificationStatus: ProfileVerificationStatus = 'pending_review';

  const externalRef: ExternalRef = {
    source: LOQUOSEX_SOURCE,
    sourceId: payload.sourceId,
    sourceUrl: payload.sourceUrl,
  };

  const personalDetails = await mapPersonalDetails(payload, resolver);

  const meetingPlaces = parseLoquosexMeetingPlaces(payload.bio);

  const primaryPhone = payload.whatsappPhone ?? payload.phone;

  const minPrice = parseLoquosexMinPrice(payload.params.priceMin);
  const prices: PriceCanonical[] =
    minPrice !== undefined ? [{ slot: 'custom', amount: minPrice, currency: 'EUR' }] : [];

  return {
    id: providerId,
    vertical: 'dating',
    category: 'escorts',
    agencyId: undefined,
    nickname: payload.nickname || payload.title,
    active: true,
    humanVerified: false,
    badges: {
      verified: false,
      trans: false,
      vip: payload.params.isPremium,
      pornstar: false,
    },
    verificationStatus,
    baseCity,
    currentCity: undefined,
    meetingPlaces,
    contactOptions: [
      ...(payload.phone ? (['calls'] as const) : []),
      ...(payload.whatsappPhone ? (['whatsapp'] as const) : []),
    ],
    personalDetails,
    priceLabelType: undefined,
    prices,
    aboutMe: payload.bio ? i18nFromOriginal(payload.bio, contentLocale) : undefined,
    serviceText: undefined,
    topTourText: undefined,
    tours: [],
    photos: payload.photos.map((p, i) => mapPhoto(p, i)),
    mainMedia: undefined,
    phoneNumber: primaryPhone ? asPhoneE164(primaryPhone) : undefined,
    email: undefined,
    encodedPhoneNumber: undefined,
    encodedTelegram: undefined,
    links: {},
    otherPlatforms: [],
    reviewsEnabled: false,
    reviewsCount: 0,
    reviewsRating: 0,
    reviewsOverall: undefined,
    ratingDistributions: undefined,
    reviews: [],
    statistics: {
      photoCount: payload.photos.length,
      videoCount: 0,
      tourCount: 0,
      isVip: payload.params.isPremium,
      isVerified: false,
    },
    lastActiveAt: undefined,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),

    externalRefs: [externalRef],
    signals: [],
    confidence: Confidence.medium,
    images: [],
    attributes: {
      services: payload.services,
      priceMin: payload.params.priceMin,
      isPremium: payload.params.isPremium,
      ...(payload.params.city ? { cityName: payload.params.city } : {}),
      ...(payload.params.zone ? { zone: payload.params.zone } : {}),
    },
    metadata: { source: LOQUOSEX_SOURCE, adapterVersion: 'v2' },
    lastScrapedAt: now.toISOString(),
  };
};
