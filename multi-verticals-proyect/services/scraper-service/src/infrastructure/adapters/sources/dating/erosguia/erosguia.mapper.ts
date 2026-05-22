import type { PersonalDetailsCanonical, ProfileVerificationStatus } from '@allcoba/shared-types';
import { asPhoneE164, asProviderId, i18nFromOriginal } from '@allcoba/shared-types';

import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';
import type { ExternalRef } from '#domain/canonical/external-ref.js';
import type { ScrapedPhoto } from '#domain/canonical/scraped-photo.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';
import { Confidence } from '#domain/canonical/confidence.js';

import type { ErosguiaPayload } from './erosguia.types.js';
import { parseErosguiaAge, parseErosguiaHeightCm, slugifyErosguia } from './erosguia.parsers.js';

/**
 * Erosguia mapper — ErosguiaPayload → ScrapedProvider (pure, async).
 *
 * Key differences vs GirlsBCN:
 *   - No weight/measurements/hair/eye fields (not present on erosguia profiles)
 *   - Telegram appears in contactOptions and otherPlatforms (not just links)
 *   - Call phone (title) and WA phone may be different numbers
 *   - Services stored in attributes.services (hobby tags, not escort services)
 *   - Confidence.high (has call phone + WA, structured city/nationality fields)
 */

export const EROSGUIA_SOURCE = 'erosguia';

export interface MapperOptions {
  readonly now?: Date;
  readonly contentLocale?: string;
}

// ============================================================================
// Photos
// ============================================================================

const mapPhoto = (photo: ErosguiaPayload['photos'][number], idx: number): ScrapedPhoto => ({
  id: `erosguia:photo:${idx}`,
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
  payload: ErosguiaPayload,
  resolver: TaxonomyResolverPort,
): Promise<PersonalDetailsCanonical> => {
  const p = payload.params;

  const nationalitySlug = slugifyErosguia(p.nationality);
  const nationalityId = nationalitySlug ? await resolver.resolveNationality(nationalitySlug) : null;

  return {
    ageYears: parseErosguiaAge(p.age) ?? 0,
    heightCm: parseErosguiaHeightCm(p.heightCm),
    nationalityId: nationalityId ?? undefined,
    spokenLanguageCodes: [],
    meetingWith: [],
  };
};

// ============================================================================
// Entry point
// ============================================================================

export const mapErosguia = async (
  payload: ErosguiaPayload,
  resolver: TaxonomyResolverPort,
  options: MapperOptions = {},
): Promise<ScrapedProvider> => {
  const now = options.now ?? new Date();
  const contentLocale = options.contentLocale ?? 'es';

  const providerId = asProviderId(`${EROSGUIA_SOURCE}:${payload.sourceId}`);

  const citySlug = slugifyErosguia(payload.params.city);
  const cityId = citySlug ? await resolver.resolveCity(citySlug, 'ES') : null;
  const baseCity = cityId ? { id: cityId } : undefined;

  const verificationStatus: ProfileVerificationStatus = 'pending_review';

  const externalRef: ExternalRef = {
    source: EROSGUIA_SOURCE,
    sourceId: payload.sourceId,
    sourceUrl: payload.sourceUrl,
  };

  const personalDetails = await mapPersonalDetails(payload, resolver);

  const primaryPhone = payload.whatsappPhone ?? payload.phone;

  return {
    id: providerId,
    vertical: 'dating',
    category: 'escorts',
    agencyId: undefined,
    nickname: payload.nickname,
    active: true,
    humanVerified: false,
    badges: {
      verified: false,
      trans: false,
      vip: false,
      pornstar: false,
    },
    verificationStatus,
    baseCity,
    currentCity: undefined,
    meetingPlaces: { incall: false, outcall: false },
    contactOptions: [
      ...(payload.phone ? (['calls'] as const) : []),
      ...(payload.whatsappPhone ? (['whatsapp'] as const) : []),
      ...(payload.telegramHref ? (['telegram'] as const) : []),
    ],
    personalDetails,
    priceLabelType: undefined,
    prices: [],
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
    otherPlatforms: payload.telegramHref
      ? [{ platform: 'telegram' as const, url: payload.telegramHref }]
      : [],
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
      isVip: false,
      isVerified: false,
    },
    lastActiveAt: undefined,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),

    externalRefs: [externalRef],
    signals: [],
    confidence: Confidence.high,
    images: [],
    attributes: {
      services: payload.services,
    },
    metadata: { source: EROSGUIA_SOURCE, adapterVersion: 'v2' },
    lastScrapedAt: now.toISOString(),
  };
};
