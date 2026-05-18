/**
 * bluemove mapper — BluemovePayload → ScrapedProvider (pure, async).
 *
 * Key facts:
 *   - sourceId = numeric hash fragment from URL (/madrid/escorts/#49049)
 *   - phone from #phoneCallSection a[href^="tel:"]
 *   - city from ficha-data-row "Ciudad" (strip province) or URL path
 *   - nationality/hair/eye resolved via TaxonomyResolverPort
 *   - Confidence.medium (has age + city + nationality)
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

import type { BluemovePayload } from './bluemove.types.js';

export const BLUEMOVE_SOURCE = 'bluemove';

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

const mapPhoto = (photo: BluemovePayload['photos'][number], idx: number): ScrapedPhoto => ({
  id: `bluemove:photo:${idx}`,
  url: photo.src,
  thumbnail: photo.src,
  isPrimary: idx === 0,
  isVerified: false,
  order: idx,
});

const mapPersonalDetails = async (
  payload: BluemovePayload,
  resolver: TaxonomyResolverPort,
): Promise<PersonalDetailsCanonical> => {
  const p = payload.params;

  const [nationalityId, hairId, eyeId] = await Promise.all([
    slugify(p.nationality) ? resolver.resolveNationality(slugify(p.nationality)!) : null,
    slugify(p.hairColor) ? resolver.resolveHair(slugify(p.hairColor)!) : null,
    slugify(p.eyeColor) ? resolver.resolveEye(slugify(p.eyeColor)!) : null,
  ]);

  return {
    ageYears: p.age ?? 0,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    nationalityId: nationalityId ?? undefined,
    hairId: hairId ?? undefined,
    eyesId: eyeId ?? undefined,
    spokenLanguageCodes: [],
    meetingWith: [],
  };
};

export const mapBluemove = async (
  payload: BluemovePayload,
  resolver: TaxonomyResolverPort,
  options: MapperOptions = {},
): Promise<ScrapedProvider> => {
  const now = options.now ?? new Date();
  const contentLocale = options.contentLocale ?? 'es';

  const providerId = asProviderId(`${BLUEMOVE_SOURCE}:${payload.sourceId}`);

  const citySlug = slugify(payload.params.city);
  const cityId = citySlug ? await resolver.resolveCity(citySlug, 'ES') : null;
  const baseCity = cityId ? { id: cityId } : undefined;

  const verificationStatus: ProfileVerificationStatus = 'pending_review';

  const externalRef: ExternalRef = {
    source: BLUEMOVE_SOURCE,
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
      ...(payload.telegram ? (['telegram'] as const) : []),
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
    encodedTelegram: payload.telegram,
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
      isVerified: payload.isVerified,
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
      zone: payload.params.zone,
      services: payload.params.services,
      paymentMethods: payload.params.paymentMethods,
      serviceLocations: payload.params.serviceLocations,
      breastSize: payload.params.breastSize,
      pubicHair: payload.params.pubicHair,
      languages: payload.params.languages,
      instagram: payload.instagram,
    },
    metadata: { source: BLUEMOVE_SOURCE, adapterVersion: 'v2' },
    lastScrapedAt: now.toISOString(),
  };
};
