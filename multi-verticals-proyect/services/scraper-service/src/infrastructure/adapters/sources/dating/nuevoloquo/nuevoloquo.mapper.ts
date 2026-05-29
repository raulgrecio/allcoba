import type { PersonalDetailsCanonical, ProfileVerificationStatus } from '@allcoba/shared-types';
import { asProviderId, i18nFromOriginal } from '@allcoba/shared-types';

import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';
import type { ExternalRef } from '#domain/canonical/external-ref.js';
import type { ScrapedPhoto } from '#domain/canonical/scraped-photo.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';
import { Confidence } from '#domain/canonical/confidence.js';

import type { NuevoloquoPayload } from './nuevoloquo.types.js';
import {
  parseNuevoloquoAge,
  parseNuevoloquoHeightCm,
  parseNuevoloquoWeightKg,
  slugifyNuevoloquo,
} from './nuevoloquo.parsers.js';

/**
 * nuevoloquo mapper — NuevoloquoPayload → ScrapedProvider (pure, async).
 *
 * Key facts:
 *   - sourceId = numeric ad ID from URL /escort/{province}/{slug}/{id}/
 *   - phone always undefined (obfuscated, requires Playwright click)
 *   - ethnicity/hair resolved via TaxonomyResolverPort
 *   - city from .card-zone .location a (strip province in parens)
 *   - country always ES
 */

export const NUEVOLOQUO_SOURCE = 'nuevoloquo';

export interface MapperOptions {
  readonly now?: Date;
  readonly contentLocale?: string;
}

const mapPhoto = (photo: NuevoloquoPayload['photos'][number], idx: number): ScrapedPhoto => ({
  id: `nuevoloquo:photo:${idx}`,
  url: photo.src,
  thumbnail: photo.src,
  isPrimary: idx === 0,
  isVerified: false,
  order: idx,
});

const mapPersonalDetails = async (
  payload: NuevoloquoPayload,
  resolver: TaxonomyResolverPort,
): Promise<PersonalDetailsCanonical> => {
  const p = payload.params;

  const ethnicSlug = slugifyNuevoloquo(p.ethnicity);
  const hairSlug = slugifyNuevoloquo(p.hairColor);

  const [ethnicId, hairId] = await Promise.all([
    ethnicSlug ? resolver.resolveEthnic(ethnicSlug) : null,
    hairSlug ? resolver.resolveHair(hairSlug) : null,
  ]);

  return {
    ageYears: parseNuevoloquoAge(p.age) ?? 0,
    heightCm: parseNuevoloquoHeightCm(p.heightCm),
    weightKg: parseNuevoloquoWeightKg(p.weightKg),
    ethnicId: ethnicId ?? undefined,
    hairId: hairId ?? undefined,
    spokenLanguageCodes: [],
    meetingWith: [],
  };
};

export const mapNuevoloquo = async (
  payload: NuevoloquoPayload,
  resolver: TaxonomyResolverPort,
  options: MapperOptions = {},
): Promise<ScrapedProvider> => {
  const now = options.now ?? new Date();
  const contentLocale = options.contentLocale ?? 'es';

  const providerId = asProviderId(`${NUEVOLOQUO_SOURCE}:${payload.sourceId}`);

  const citySlug = slugifyNuevoloquo(payload.params.locationCity);
  const cityId = citySlug ? await resolver.resolveCity(citySlug, 'ES') : null;
  const baseCity = cityId ? { id: cityId } : undefined;

  const verificationStatus: ProfileVerificationStatus = payload.isVerified
    ? 'verified'
    : 'pending_review';

  const externalRef: ExternalRef = {
    source: NUEVOLOQUO_SOURCE,
    sourceId: payload.sourceId,
    sourceUrl: payload.sourceUrl,
  };

  const personalDetails = await mapPersonalDetails(payload, resolver);

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
    contactOptions: [],
    personalDetails,
    priceLabelType: undefined,
    prices: [],
    aboutMe: payload.bio ? i18nFromOriginal(payload.bio, contentLocale) : undefined,
    serviceText: undefined,
    topTourText: undefined,
    tours: [],
    photos: payload.photos.map((p, i) => mapPhoto(p, i)),
    mainMedia: undefined,
    phoneNumber: undefined,
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
      videoCount: payload.hasVideo ? 1 : 0,
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
      measurements: payload.params.measurements,
      serviceType: payload.params.serviceType,
      languages: payload.params.languages,
    },
    metadata: { source: NUEVOLOQUO_SOURCE, adapterVersion: 'v2' },
    lastScrapedAt: now.toISOString(),
  };
};
