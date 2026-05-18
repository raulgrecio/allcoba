/**
 * Ardienteplacer mapper — ArdientePlacerPayload → ScrapedProvider (pure, async).
 *
 * Key facts:
 *   - sourceId = numeric ad ID from URL
 *   - phone from HTML modal (.modal1 .tel b), fallback URL
 *   - nationality from flag img alt
 *   - rate from ul.entry-meta li "80 €/hora"
 *   - services list from h5.titulo:Servicios + ul.list-unstyled
 *   - No verified badge on this source
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
  parseArdientePlacerAge,
  parseArdientePlacerRate,
  slugifyArdienteplacer,
} from './ardienteplacer.parsers.js';
import type { ArdientePlacerPayload } from './ardienteplacer.types.js';

export const ARDIENTEPLACER_SOURCE = 'ardienteplacer';

export interface MapperOptions {
  readonly now?: Date;
  readonly contentLocale?: string;
}

const mapPhoto = (
  photo: ArdientePlacerPayload['photos'][number],
  idx: number,
): ScrapedPhoto => ({
  id: `ardienteplacer:photo:${idx}`,
  url: photo.src,
  thumbnail: photo.src,
  isPrimary: idx === 0,
  isVerified: false,
  order: idx,
});

const mapPersonalDetails = async (
  payload: ArdientePlacerPayload,
  resolver: TaxonomyResolverPort,
): Promise<PersonalDetailsCanonical> => {
  const p = payload.params;

  const nationalitySlug = slugifyArdienteplacer(p.nationality);
  const nationalityId = nationalitySlug
    ? await resolver.resolveNationality(nationalitySlug)
    : null;

  return {
    ageYears: parseArdientePlacerAge(p.age) ?? 0,
    nationalityId: nationalityId ?? undefined,
    spokenLanguageCodes: [],
    meetingWith: [],
  };
};

export const mapArdienteplacer = async (
  payload: ArdientePlacerPayload,
  resolver: TaxonomyResolverPort,
  options: MapperOptions = {},
): Promise<ScrapedProvider> => {
  const now = options.now ?? new Date();
  const contentLocale = options.contentLocale ?? 'es';

  const providerId = asProviderId(`${ARDIENTEPLACER_SOURCE}:${payload.sourceId}`);

  const citySlug = slugifyArdienteplacer(payload.params.city);
  const cityId = citySlug ? await resolver.resolveCity(citySlug, 'ES') : null;
  const baseCity = cityId ? { id: cityId } : undefined;

  const verificationStatus: ProfileVerificationStatus = 'pending_review';

  const externalRef: ExternalRef = {
    source: ARDIENTEPLACER_SOURCE,
    sourceId: payload.sourceId,
    sourceUrl: payload.sourceUrl,
  };

  const personalDetails = await mapPersonalDetails(payload, resolver);

  const rateAmount = parseArdientePlacerRate(payload.params.rateRaw);
  const prices = rateAmount
    ? [{ slot: 'h1' as const, amount: rateAmount, currency: 'EUR' as const }]
    : [];

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
    prices,
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
    confidence: Confidence.medium,
    images: [],
    attributes: {
      services: payload.services,
      rateRaw: payload.params.rateRaw,
    },
    metadata: { source: ARDIENTEPLACER_SOURCE, adapterVersion: 'v2' },
    lastScrapedAt: now.toISOString(),
  };
};
