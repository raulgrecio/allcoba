/**
 * Chicasmalas mapper — ChicasmalasPayload → ScrapedProvider (pure, async).
 *
 * Key facts:
 *   - Elementor WordPress site (Playwright-rendered)
 *   - sourceId = URL slug (includes phone number)
 *   - phone from tel: links, fallback from URL slug
 *   - city from Google Maps iframe q param or URL slug last segment
 *   - No rates / services in HTML (free-text bio only)
 *   - confidence = low (Playwright-rendered, phone in slug may be masked later)
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

import type { ChicasmalasPayload } from './chicasmalas.types.js';

export const CHICASMALAS_SOURCE = 'chicasmalas';

export interface MapperOptions {
  readonly now?: Date;
  readonly contentLocale?: string;
}

const mapPhoto = (photo: ChicasmalasPayload['photos'][number], idx: number): ScrapedPhoto => ({
  id: `chicasmalas:photo:${idx}`,
  url: photo.src,
  thumbnail: photo.src,
  isPrimary: idx === 0,
  isVerified: false,
  order: idx,
});

export const mapChicasmalas = async (
  payload: ChicasmalasPayload,
  resolver: TaxonomyResolverPort,
  options: MapperOptions = {},
): Promise<ScrapedProvider> => {
  const now = options.now ?? new Date();
  const contentLocale = options.contentLocale ?? 'es';

  const providerId = asProviderId(`${CHICASMALAS_SOURCE}:${payload.sourceId}`);

  const citySlug = payload.city
    ? payload.city
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
    : undefined;
  const cityId = citySlug ? await resolver.resolveCity(citySlug, 'ES') : null;
  const baseCity = cityId ? { id: cityId } : undefined;

  const verificationStatus: ProfileVerificationStatus = 'pending_review';

  const externalRef: ExternalRef = {
    source: CHICASMALAS_SOURCE,
    sourceId: payload.sourceId,
    sourceUrl: payload.sourceUrl,
  };

  const photos = payload.photos.map((p, i) => mapPhoto(p, i));

  const primaryPhone = payload.phone ?? payload.whatsappPhone;

  const personalDetails: PersonalDetailsCanonical = {
    ageYears: 0,
    nationalityId: undefined,
    spokenLanguageCodes: [],
    meetingWith: [],
  };

  return {
    id: providerId,
    vertical: 'dating',
    category: 'escorts',
    agencyId: undefined,
    nickname: payload.nickname || payload.title,
    active: true,
    humanVerified: false,
    badges: {
      verified: payload.isVerified,
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
    ],
    personalDetails,
    priceLabelType: undefined,
    prices: [],
    aboutMe: payload.bio ? i18nFromOriginal(payload.bio, contentLocale) : undefined,
    serviceText: undefined,
    topTourText: undefined,
    tours: [],
    photos,
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
      photoCount: photos.length,
      videoCount: 0,
      tourCount: 0,
      isVip: false,
      isVerified: payload.isVerified,
    },
    lastActiveAt: undefined,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    externalRefs: [externalRef],
    signals: [],
    confidence: Confidence.low,
    images: [],
    attributes: {
      isVerified: payload.isVerified,
    },
    metadata: { source: CHICASMALAS_SOURCE, adapterVersion: 'v2' },
    lastScrapedAt: now.toISOString(),
  };
};
