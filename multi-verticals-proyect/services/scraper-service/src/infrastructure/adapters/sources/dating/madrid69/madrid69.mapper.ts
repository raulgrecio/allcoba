/**
 * Madrid69 mapper — Madrid69Payload → ScrapedProvider (pure, async).
 *
 * Key facts:
 *   - Data from Next.js SSR head tags + Playwright-captured Laravel API
 *   - sourceId = numeric ID from URL slug
 *   - phone/whatsapp from API profile (9-digit normalized)
 *   - city from API (string) or URL slug
 *   - confidence = medium when age/nationality present (API data), low otherwise
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

import { slugifyMadrid69 } from './madrid69.parsers.js';
import type { Madrid69Payload } from './madrid69.types.js';

export const MADRID69_SOURCE = 'madrid69';

export interface MapperOptions {
  readonly now?: Date;
  readonly contentLocale?: string;
  /** Sobreescribe el identificador de fuente (sitios clon: valenciacitas). */
  readonly source?: string;
}

const mapPhoto = (photo: Madrid69Payload['photos'][number], idx: number): ScrapedPhoto => ({
  id: `madrid69:photo:${idx}`,
  url: photo.src,
  thumbnail: photo.src,
  isPrimary: idx === 0,
  isVerified: false,
  order: idx,
});

export const mapMadrid69 = async (
  payload: Madrid69Payload,
  resolver: TaxonomyResolverPort,
  options: MapperOptions = {},
): Promise<ScrapedProvider> => {
  const now = options.now ?? new Date();
  const contentLocale = options.contentLocale ?? 'es';
  const source = options.source ?? MADRID69_SOURCE;

  const providerId = asProviderId(`${source}:${payload.sourceId}`);

  const citySlug = payload.city ? slugifyMadrid69(payload.city) : undefined;
  const cityId = citySlug ? await resolver.resolveCity(citySlug, 'ES') : null;
  const baseCity = cityId ? { id: cityId } : undefined;

  const nationalitySlug = payload.nationality
    ? slugifyMadrid69(payload.nationality)
    : undefined;
  const nationalityId = nationalitySlug
    ? await resolver.resolveNationality(nationalitySlug)
    : null;

  const verificationStatus: ProfileVerificationStatus = 'pending_review';

  const externalRef: ExternalRef = {
    source,
    sourceId: payload.sourceId,
    sourceUrl: payload.sourceUrl,
  };

  const photos = payload.photos.map((p, i) => mapPhoto(p, i));

  const primaryPhone = payload.phone ?? payload.whatsappPhone;

  const personalDetails: PersonalDetailsCanonical = {
    ageYears: payload.age ?? 0,
    nationalityId: nationalityId ?? undefined,
    spokenLanguageCodes: [],
    meetingWith: [],
  };

  // medium when API data is present (age or nationality), low for head-only extraction
  const confidence =
    payload.age != null || payload.nationality != null ? Confidence.medium : Confidence.low;

  return {
    id: providerId,
    vertical: 'dating',
    category: 'escorts',
    agencyId: undefined,
    nickname: payload.nickname ?? payload.title ?? payload.sourceId,
    active: true,
    humanVerified: false,
    badges: {
      verified: payload.isVerified,
      trans: false,
      vip: payload.isVip,
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
      isVip: payload.isVip,
      isVerified: payload.isVerified,
    },
    lastActiveAt: undefined,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    externalRefs: [externalRef],
    signals: [],
    confidence,
    images: [],
    attributes: {
      isVerified: payload.isVerified,
      isVip: payload.isVip,
      ...(payload.heightCm != null ? { heightCm: payload.heightCm } : {}),
      ...(payload.weightKg != null ? { weightKg: payload.weightKg } : {}),
      ...(payload.languages?.length ? { languages: payload.languages } : {}),
      ...(payload.services?.length ? { services: payload.services } : {}),
    },
    metadata: { source, adapterVersion: 'v2' },
    lastScrapedAt: now.toISOString(),
  };
};
