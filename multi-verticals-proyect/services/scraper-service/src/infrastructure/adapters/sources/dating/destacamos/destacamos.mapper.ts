/**
 * Destacamos mapper — DestacamosPayload → ScrapedProvider (pure, async).
 *
 * Key facts:
 *   - sourceId = /{id}- from URL
 *   - phone from #detallesimportantes a[href^="tel:"]
 *   - city/nationality/age/height from #details div key-value rows
 *   - isPremium from .premiumdet badge
 *   - photos from #gallery a.fimage href (full-size)
 *   - No services list in HTML
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

import {
  parseDestacamosAge,
  parseDestacamosHeightCm,
  slugifyDestacamos,
} from './destacamos.parsers.js';
import type { DestacamosPayload } from './destacamos.types.js';

export const DESTACAMOS_SOURCE = 'destacamos';

export interface MapperOptions {
  readonly now?: Date;
  readonly contentLocale?: string;
}

const mapPhoto = (photo: DestacamosPayload['photos'][number], idx: number): ScrapedPhoto => ({
  id: `destacamos:photo:${idx}`,
  url: photo.src,
  thumbnail: photo.src,
  isPrimary: idx === 0,
  isVerified: false,
  order: idx,
});

const mapPersonalDetails = async (
  payload: DestacamosPayload,
  resolver: TaxonomyResolverPort,
): Promise<PersonalDetailsCanonical> => {
  const p = payload.params;

  const nationalitySlug = slugifyDestacamos(p.nationality);
  const nationalityId = nationalitySlug
    ? await resolver.resolveNationality(nationalitySlug)
    : null;

  const heightCm = parseDestacamosHeightCm(p.heightRaw);

  return {
    ageYears: parseDestacamosAge(p.age) ?? 0,
    nationalityId: nationalityId ?? undefined,
    ...(heightCm ? { heightCm } : {}),
    spokenLanguageCodes: [],
    meetingWith: [],
  };
};

export const mapDestacamos = async (
  payload: DestacamosPayload,
  resolver: TaxonomyResolverPort,
  options: MapperOptions = {},
): Promise<ScrapedProvider> => {
  const now = options.now ?? new Date();
  const contentLocale = options.contentLocale ?? 'es';

  const providerId = asProviderId(`${DESTACAMOS_SOURCE}:${payload.sourceId}`);

  const citySlug = slugifyDestacamos(payload.params.city);
  const cityId = citySlug ? await resolver.resolveCity(citySlug, 'ES') : null;
  const baseCity = cityId ? { id: cityId } : undefined;

  const verificationStatus: ProfileVerificationStatus = 'pending_review';

  const externalRef: ExternalRef = {
    source: DESTACAMOS_SOURCE,
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
    nickname: payload.nickname || payload.title,
    active: true,
    humanVerified: false,
    badges: {
      verified: false,
      trans: false,
      vip: payload.isPremium,
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
      isVip: payload.isPremium,
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
      isPremium: payload.isPremium,
      hairColor: payload.params.hairColor,
      heightCm: parseDestacamosHeightCm(payload.params.heightRaw),
      languages: payload.params.languages,
      schedule: payload.params.schedule,
    },
    metadata: { source: DESTACAMOS_SOURCE, adapterVersion: 'v2' },
    lastScrapedAt: now.toISOString(),
  };
};
