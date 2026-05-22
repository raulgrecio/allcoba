import type { PersonalDetailsCanonical, ProfileVerificationStatus } from '@allcoba/shared-types';
import { asPhoneE164, asProviderId, i18nFromOriginal } from '@allcoba/shared-types';

import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';
import type { ExternalRef } from '#domain/canonical/external-ref.js';
import type { ScrapedPhoto } from '#domain/canonical/scraped-photo.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';
import { Confidence } from '#domain/canonical/confidence.js';

import type { GemidosPayload } from './gemidos.types.js';

/**
 * gemidos mapper — GemidosPayload → ScrapedProvider (pure, async).
 *
 * Key facts:
 *   - sourceId = slug from /anuncio/{slug}/
 *   - phone from .pub-phone span (plain text)
 *   - no city (not in HTML)
 *   - nationality/ethnicity resolved via TaxonomyResolverPort
 *   - CF WAF protected — Confidence.low (bypass required)
 */

export const GEMIDOS_SOURCE = 'gemidos';

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

const mapPhoto = (photo: GemidosPayload['photos'][number], idx: number): ScrapedPhoto => ({
  id: `gemidos:photo:${idx}`,
  url: photo.src,
  thumbnail: photo.src,
  isPrimary: idx === 0,
  isVerified: false,
  order: idx,
});

const mapPersonalDetails = async (
  payload: GemidosPayload,
  resolver: TaxonomyResolverPort,
): Promise<PersonalDetailsCanonical> => {
  const p = payload.params;

  const [nationalityId, ethnicId] = await Promise.all([
    slugify(p.nationality) ? resolver.resolveNationality(slugify(p.nationality)!) : null,
    slugify(p.ethnicity) ? resolver.resolveEthnic(slugify(p.ethnicity)!) : null,
  ]);

  return {
    ageYears: p.age ?? 0,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    nationalityId: nationalityId ?? undefined,
    ethnicId: ethnicId ?? undefined,
    spokenLanguageCodes: [],
    meetingWith: [],
  };
};

export const mapGemidos = async (
  payload: GemidosPayload,
  resolver: TaxonomyResolverPort,
  options: MapperOptions = {},
): Promise<ScrapedProvider> => {
  const now = options.now ?? new Date();
  const contentLocale = options.contentLocale ?? 'es';

  const providerId = asProviderId(`${GEMIDOS_SOURCE}:${payload.sourceId}`);

  const verificationStatus: ProfileVerificationStatus = 'pending_review';

  const externalRef: ExternalRef = {
    source: GEMIDOS_SOURCE,
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
      services: payload.params.services,
    },
    metadata: { source: GEMIDOS_SOURCE, adapterVersion: 'v2' },
    lastScrapedAt: now.toISOString(),
  };
};
