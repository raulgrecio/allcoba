/**
 * GirlsBCN / GirlsMadrid mapper — shared, pure, async.
 *
 * Both sites produce a `GirlsBcnPayload` (same shape, different extractor).
 * The `source` parameter distinguishes them for externalRefs and id generation.
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
  parseGBCNAge,
  parseGBCNHeightCm,
  parseGBCNMeasurements,
  parseGBCNMeetingPlaces,
  parseGBCNWeightKg,
  slugifyGBCN,
} from './girlsbcn.parsers.js';
import type { GirlsBcnPayload } from './girlsbcn.types.js';

export const GIRLSBCN_SOURCE = 'girlsbcn';
export const GIRLSMADRID_SOURCE = 'girlsmadrid';

export type GirlsBcnSource = typeof GIRLSBCN_SOURCE | typeof GIRLSMADRID_SOURCE;

export interface MapperOptions {
  readonly now?: Date;
  readonly contentLocale?: string;
}

// ============================================================================
// Photos
// ============================================================================

const mapPhoto = (photo: GirlsBcnPayload['photos'][number], idx: number): ScrapedPhoto => ({
  id: `gbcn:photo:${idx}`,
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
  payload: GirlsBcnPayload,
  resolver: TaxonomyResolverPort,
): Promise<PersonalDetailsCanonical> => {
  const p = payload.params;

  const nationalitySlug = slugifyGBCN(p.nationality);
  const hairSlug = slugifyGBCN(p.hairColor);
  const eyeSlug = slugifyGBCN(p.eyeColor);
  const citySlug = slugifyGBCN(p.city);

  const [nationalityId, hairId, eyeId, cityId] = await Promise.all([
    nationalitySlug ? resolver.resolveNationality(nationalitySlug) : null,
    hairSlug ? resolver.resolveHair(hairSlug) : null,
    eyeSlug ? resolver.resolveEye(eyeSlug) : null,
    citySlug ? resolver.resolveCity(citySlug, 'ES') : null,
  ]);

  const { bustCm, waistCm, hipCm } = parseGBCNMeasurements(p.measurements);

  return {
    ageYears: parseGBCNAge(p.age) ?? 0,
    heightCm: parseGBCNHeightCm(p.heightCm),
    weightKg: parseGBCNWeightKg(p.weightKg),
    bustCm,
    waistCm,
    hipCm,
    nationalityId: nationalityId ?? undefined,
    hairId: hairId ?? undefined,
    eyesId: eyeId ?? undefined,
    spokenLanguageCodes: [],
    meetingWith: [],
  };
};

// ============================================================================
// Entry point
// ============================================================================

export const mapGirlsBcnLike = async (
  payload: GirlsBcnPayload,
  source: GirlsBcnSource,
  resolver: TaxonomyResolverPort,
  options: MapperOptions = {},
): Promise<ScrapedProvider> => {
  const now = options.now ?? new Date();
  const contentLocale = options.contentLocale ?? 'es';

  const providerId = asProviderId(`${source}:${payload.sourceId}`);

  const citySlug = slugifyGBCN(payload.params.city);
  const cityId = citySlug ? await resolver.resolveCity(citySlug, 'ES') : null;
  const baseCity = cityId ? { id: cityId } : undefined;

  const verificationStatus: ProfileVerificationStatus = 'pending_review';

  const externalRef: ExternalRef = {
    source,
    sourceId: payload.sourceId,
    sourceUrl: payload.sourceUrl,
  };

  const personalDetails = await mapPersonalDetails(payload, resolver);

  const meetingPlaces = parseGBCNMeetingPlaces(payload.bio, payload.params.meetingPlaces);

  const hasVideo = !!payload.video;
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
    meetingPlaces,
    contactOptions: [
      ...(payload.phone ? ['calls' as const] : []),
      ...(payload.whatsappPhone ? ['whatsapp' as const] : []),
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
      videoCount: hasVideo ? 1 : 0,
      tourCount: 0,
      isVip: false,
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
      priceRange: payload.params.priceRange,
      schedule: payload.params.schedule,
      videoUrl: payload.video?.src,
    },
    metadata: { source, adapterVersion: 'v2' },
    lastScrapedAt: now.toISOString(),
  };
};

/** Convenience wrapper for girlsbcn.net. */
export const mapGirlsBcn = (
  payload: GirlsBcnPayload,
  resolver: TaxonomyResolverPort,
  options?: MapperOptions,
): Promise<ScrapedProvider> => mapGirlsBcnLike(payload, GIRLSBCN_SOURCE, resolver, options);
