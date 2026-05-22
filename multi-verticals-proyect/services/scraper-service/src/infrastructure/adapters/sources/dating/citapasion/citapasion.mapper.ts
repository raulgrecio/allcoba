import type { PersonalDetailsCanonical, ProfileVerificationStatus } from '@allcoba/shared-types';
import { asPhoneE164, asProviderId, i18nFromOriginal } from '@allcoba/shared-types';

import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';
import type { ExternalRef } from '#domain/canonical/external-ref.js';
import type { ScrapedPhoto } from '#domain/canonical/scraped-photo.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';
import { Confidence } from '#domain/canonical/confidence.js';

import type { CitapasionPayload } from './citapasion.types.js';

/**
 * citapasion mapper — CitapasionPayload → ScrapedProvider (pure, async).
 *
 * Key facts:
 *   - sourceId = numeric ID from /escorts/{numericId}
 *   - phone from data-href="tel:..." (AJAX-revealed) or a[href^="tel:"]
 *   - city from "Ciudad:" data row
 *   - nationality/hair/eye resolved via TaxonomyResolverPort
 *   - Confidence.medium (has age + city + nationality)
 */

export const CITAPASION_SOURCE = 'citapasion';

export interface MapperOptions {
  readonly now?: Date;
  readonly contentLocale?: string;
}

const slugify = (text: string | undefined): string | undefined => {
  if (!text) return undefined;
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || undefined
  );
};

const mapPhoto = (photo: CitapasionPayload['photos'][number], idx: number): ScrapedPhoto => ({
  id: `citapasion:photo:${idx}`,
  url: photo.src,
  thumbnail: photo.src,
  isPrimary: idx === 0,
  isVerified: false,
  order: idx,
});

const mapPersonalDetails = async (
  payload: CitapasionPayload,
  resolver: TaxonomyResolverPort,
): Promise<PersonalDetailsCanonical> => {
  const p = payload.params;

  const nationalitySlug = slugify(p.nationality);
  const hairSlug = slugify(p.hairColor);
  const eyeSlug = slugify(p.eyeColor);
  const ethnicSlug = slugify(p.ethnicity);

  const [nationalityId, hairId, eyeId, ethnicId] = await Promise.all([
    nationalitySlug ? resolver.resolveNationality(nationalitySlug) : null,
    hairSlug ? resolver.resolveHair(hairSlug) : null,
    eyeSlug ? resolver.resolveEye(eyeSlug) : null,
    ethnicSlug ? resolver.resolveEthnic(ethnicSlug) : null,
  ]);

  return {
    ageYears: p.age ?? 0,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    nationalityId: nationalityId ?? undefined,
    hairId: hairId ?? undefined,
    eyesId: eyeId ?? undefined,
    ethnicId: ethnicId ?? undefined,
    spokenLanguageCodes: [],
    meetingWith: [],
  };
};

export const mapCitapasion = async (
  payload: CitapasionPayload,
  resolver: TaxonomyResolverPort,
  options: MapperOptions = {},
): Promise<ScrapedProvider> => {
  const now = options.now ?? new Date();
  const contentLocale = options.contentLocale ?? 'es';

  const providerId = asProviderId(`${CITAPASION_SOURCE}:${payload.sourceId}`);

  const citySlug = slugify(payload.params.city);
  const cityId = citySlug ? await resolver.resolveCity(citySlug, 'ES') : null;
  const baseCity = cityId ? { id: cityId } : undefined;

  const verificationStatus: ProfileVerificationStatus = 'pending_review';

  const externalRef: ExternalRef = {
    source: CITAPASION_SOURCE,
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
    photos: payload.photos.map((p, i) => mapPhoto(p, i)),
    mainMedia: undefined,
    phoneNumber: primaryPhone ? asPhoneE164(primaryPhone) : undefined,
    email: undefined,
    encodedPhoneNumber: undefined,
    encodedTelegram: undefined,
    links: {},
    otherPlatforms: [],
    reviewsEnabled: !!payload.siteRating,
    reviewsCount: payload.siteRating?.count ?? 0,
    reviewsRating: payload.siteRating?.score ?? 0,
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
    confidence: Confidence.medium,
    images: [],
    attributes: {
      tattoos: payload.params.tattoos,
      piercings: payload.params.piercings,
      smoker: payload.params.smoker,
      zone: payload.params.zone,
      languages: payload.params.languages,
    },
    metadata: { source: CITAPASION_SOURCE, adapterVersion: 'v2' },
    lastScrapedAt: now.toISOString(),
  };
};
