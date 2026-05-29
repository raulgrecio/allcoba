import type { PersonalDetailsCanonical, ProfileVerificationStatus } from '@allcoba/shared-types';
import { asPhoneE164, asProviderId, i18nFromOriginal } from '@allcoba/shared-types';

import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';
import type { ExternalRef } from '#domain/canonical/external-ref.js';
import type { ScrapedPhoto } from '#domain/canonical/scraped-photo.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';
import { Confidence } from '#domain/canonical/confidence.js';

import type { NuevapasionPayload } from './nuevapasion.types.js';

/**
 * nuevapasion mapper — NuevapasionPayload → ScrapedProvider (pure, async).
 *
 * Key facts:
 *   - sourceId = slug from URL /anuncio/{slug}
 *   - phone from a[href^="tel:"]
 *   - no city/age/nationality extraction (not in static HTML)
 *   - Confidence.low (minimal data)
 */

export const NUEVAPASION_SOURCE = 'nuevapasion';

export interface MapperOptions {
  readonly now?: Date;
  readonly contentLocale?: string;
}

const mapPhoto = (photo: NuevapasionPayload['photos'][number], idx: number): ScrapedPhoto => ({
  id: `nuevapasion:photo:${idx}`,
  url: photo.src,
  thumbnail: photo.src,
  isPrimary: idx === 0,
  isVerified: false,
  order: idx,
});

const mapPersonalDetails = (_resolver: TaxonomyResolverPort): PersonalDetailsCanonical => ({
  ageYears: 0,
  spokenLanguageCodes: [],
  meetingWith: [],
});

export const mapNuevapasion = async (
  payload: NuevapasionPayload,
  resolver: TaxonomyResolverPort,
  options: MapperOptions = {},
): Promise<ScrapedProvider> => {
  const now = options.now ?? new Date();
  const contentLocale = options.contentLocale ?? 'es';

  const providerId = asProviderId(`${NUEVAPASION_SOURCE}:${payload.sourceId}`);

  const verificationStatus: ProfileVerificationStatus = 'pending_review';

  const externalRef: ExternalRef = {
    source: NUEVAPASION_SOURCE,
    sourceId: payload.sourceId,
    sourceUrl: payload.sourceUrl,
  };

  const personalDetails = mapPersonalDetails(resolver);

  const primaryPhone = payload.whatsappPhone ?? payload.phone;

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
      vip: false,
      pornstar: false,
    },
    verificationStatus,
    baseCity: undefined,
    currentCity: undefined,
    meetingPlaces: { incall: false, outcall: false },
    contactOptions: [
      ...(payload.phone ? (['calls'] as const) : []),
      ...(payload.whatsappPhone ? (['whatsapp'] as const) : []),
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
      isVip: false,
      isVerified: false,
    },
    lastActiveAt: undefined,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),

    externalRefs: [externalRef],
    signals: [],
    confidence: Confidence.low,
    images: [],
    attributes: {},
    metadata: { source: NUEVAPASION_SOURCE, adapterVersion: 'v2' },
    lastScrapedAt: now.toISOString(),
  };
};
