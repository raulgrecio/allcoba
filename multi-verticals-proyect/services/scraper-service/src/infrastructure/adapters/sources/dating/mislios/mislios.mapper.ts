/**
 * mislios mapper — MisliosPayload → ScrapedProvider (pure, async).
 *
 * Key facts:
 *   - sourceId = last URL segment (/anuncios/{slug}/)
 *   - phone from a[href^="tel:"]
 *   - no city/age/nationality in static HTML
 *   - country: ES (mislios.com is Spain-only)
 *   - Confidence.low (minimal data)
 */

import {
  asPhoneE164,
  asProviderId,
  type PersonalDetailsCanonical,
  type ProfileVerificationStatus,
  i18nFromOriginal,
} from '@allcoba/shared-types';

import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';
import type { ExternalRef } from '#domain/canonical/external-ref.js';
import type { ScrapedPhoto } from '#domain/canonical/scraped-photo.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';
import { Confidence } from '#domain/canonical/confidence.js';

import type { MisliosPayload } from './mislios.types.js';

export const MISLIOS_SOURCE = 'mislios';

export interface MapperOptions {
  readonly now?: Date;
  readonly contentLocale?: string;
}

const mapPhoto = (photo: MisliosPayload['photos'][number], idx: number): ScrapedPhoto => ({
  id: `mislios:photo:${idx}`,
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

export const mapMislios = async (
  payload: MisliosPayload,
  resolver: TaxonomyResolverPort,
  options: MapperOptions = {},
): Promise<ScrapedProvider> => {
  const now = options.now ?? new Date();
  const contentLocale = options.contentLocale ?? 'es';

  const providerId = asProviderId(`${MISLIOS_SOURCE}:${payload.sourceId}`);

  const verificationStatus: ProfileVerificationStatus = 'pending_review';

  const externalRef: ExternalRef = {
    source: MISLIOS_SOURCE,
    sourceId: payload.sourceId,
    sourceUrl: payload.sourceUrl,
  };

  const personalDetails = mapPersonalDetails(resolver);

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
    contactOptions: [...(payload.phone ? (['calls'] as const) : [])],
    personalDetails,
    priceLabelType: undefined,
    prices: [],
    aboutMe: payload.bio ? i18nFromOriginal(payload.bio, contentLocale) : undefined,
    serviceText: undefined,
    topTourText: undefined,
    tours: [],
    photos: payload.photos.map((p, i) => mapPhoto(p, i)),
    mainMedia: undefined,
    phoneNumber: payload.phone ? asPhoneE164(payload.phone) : undefined,
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
    metadata: { source: MISLIOS_SOURCE, adapterVersion: 'v2' },
    lastScrapedAt: now.toISOString(),
  };
};
