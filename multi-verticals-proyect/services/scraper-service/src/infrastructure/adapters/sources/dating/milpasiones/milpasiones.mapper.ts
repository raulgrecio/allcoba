/**
 * Milpasiones mapper — MilpasionesPayload → ScrapedProvider (pure, async).
 *
 * Key facts:
 *   - sourceId = numeric ad ID from URL (_id)
 *   - phone = 9-digit from URL /anuncio/{phone}-...
 *   - city from meta[name="geo.placename"]
 *   - No services/rates (body JS-rendered, not in static HTML)
 *   - No WhatsApp on this source in static head
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

import { slugifyMilpasiones } from './milpasiones.parsers.js';
import type { MilpasionesPayload } from './milpasiones.types.js';

export const MILPASIONES_SOURCE = 'milpasiones';

export interface MapperOptions {
  readonly now?: Date;
  readonly contentLocale?: string;
}

const mapPhoto = (
  photo: MilpasionesPayload['photos'][number],
  idx: number,
): ScrapedPhoto => ({
  id: `milpasiones:photo:${idx}`,
  url: photo.src,
  thumbnail: photo.src,
  isPrimary: idx === 0,
  isVerified: false,
  order: idx,
});

const mapPersonalDetails = async (
  _payload: MilpasionesPayload,
  _resolver: TaxonomyResolverPort,
): Promise<PersonalDetailsCanonical> => ({
  ageYears: 0,
  spokenLanguageCodes: [],
  meetingWith: [],
});

export const mapMilpasiones = async (
  payload: MilpasionesPayload,
  resolver: TaxonomyResolverPort,
  options: MapperOptions = {},
): Promise<ScrapedProvider> => {
  const now = options.now ?? new Date();
  const contentLocale = options.contentLocale ?? 'es';

  const providerId = asProviderId(`${MILPASIONES_SOURCE}:${payload.sourceId}`);

  const citySlug = slugifyMilpasiones(payload.params.city);
  const cityId = citySlug ? await resolver.resolveCity(citySlug, 'ES') : null;
  const baseCity = cityId ? { id: cityId } : undefined;

  const verificationStatus: ProfileVerificationStatus = 'pending_review';

  const externalRef: ExternalRef = {
    source: MILPASIONES_SOURCE,
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
      verified: false,
      trans: false,
      vip: false,
      pornstar: false,
    },
    verificationStatus,
    baseCity,
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
    metadata: { source: MILPASIONES_SOURCE, adapterVersion: 'v2' },
    lastScrapedAt: now.toISOString(),
  };
};
