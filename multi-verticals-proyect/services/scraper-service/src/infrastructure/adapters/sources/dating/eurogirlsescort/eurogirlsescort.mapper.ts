import type {
  ContactOption,
  PersonalDetailsCanonical,
  PriceCanonical,
  ProfileVerificationStatus,
  ReviewCanonical,
  ReviewSubratings,
} from '@allcoba/shared-types';
import { asPhoneE164, asProviderId, asReviewId, i18nFromOriginal } from '@allcoba/shared-types';

import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';
import type { ExternalRef } from '#domain/canonical/external-ref.js';
import type { ScrapedPhoto } from '#domain/canonical/scraped-photo.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';
import { Confidence } from '#domain/canonical/confidence.js';

import type {
  EuroGirlsEscortPayload,
  EuroGirlsEscortPhone,
  EuroGirlsEscortRate,
  EuroGirlsEscortReview,
} from './eurogirlsescort.types.js';
import {
  normalizeEGEGender,
  parseDurationSlot,
  parseEGEAvailableFor,
  parseEGEDate,
  parseEGEHeightCm,
  parseEGEMeetingWith,
  parseEGEWeightKg,
  slugify,
} from './eurogirlsescort.parsers.js';

/**
 * EuroGirlsEscortMapper — pure mapping from raw payload to ScrapedProvider v2.
 *
 * Dependency inversion: depends on TaxonomyResolverPort for slug → catalog id.
 * No I/O, no DB, no clock except injected. Tests inject FakeTaxonomyResolver.
 *
 * Source-of-truth preference for each canonical field:
 *   1. Structured params block (reliable: parsed from HTML tables/spans)
 *   2. Slug extracted from href in params (for city/country)
 *   3. Slugified display text (for nationality/ethnicity/hair/eyes/orientation)
 *
 * EuroGirlsEscort does NOT embed Schema.org JSON, so no @graph fallback here.
 */

export const EUROGIRLSESCORT_SOURCE = 'eurogirlsescort';

export interface MapperOptions {
  readonly now?: Date;
  /** Locale tag for bio/serviceText i18n. Default: 'en'. */
  readonly contentLocale?: string;
}

// ============================================================================
// Photo mapping
// ============================================================================

const mapPhoto = (photo: EuroGirlsEscortPayload['photos'][number], idx: number): ScrapedPhoto => ({
  id: `${EUROGIRLSESCORT_SOURCE}:photo:${idx}`,
  url: photo.href,
  thumbnail: photo.href,
  isPrimary: idx === 0,
  isVerified: false,
  order: idx,
});

// ============================================================================
// Price mapping
// ============================================================================

const mapRate = (rate: EuroGirlsEscortRate): PriceCanonical[] => {
  const slot = parseDurationSlot(rate.duration);
  const prices: PriceCanonical[] = [];

  if (rate.incallAmount !== undefined && rate.incallCurrency) {
    prices.push({
      slot,
      amount: rate.incallAmount,
      currency: rate.incallCurrency as PriceCanonical['currency'],
    });
  }
  if (rate.outcallAmount !== undefined && rate.outcallCurrency) {
    prices.push({
      slot,
      amount: rate.outcallAmount,
      currency: rate.outcallCurrency as PriceCanonical['currency'],
    });
  }
  return prices;
};

// ============================================================================
// Contact options
// ============================================================================

const mapContactOptions = (phones: EuroGirlsEscortPhone[]): ContactOption[] => {
  const options = new Set<ContactOption>();
  for (const p of phones) {
    if (p.number) options.add('calls');
    if (p.hasWhatsapp) options.add('whatsapp');
  }
  return Array.from(options);
};

// ============================================================================
// Reviews
// ============================================================================

const ZERO_RATINGS: ReviewSubratings = {
  place: 0,
  punctuality: 0,
  looks: 0,
  attitude: 0,
  services: 0,
  photosAccuracy: 0,
};

const mapReview = (
  raw: EuroGirlsEscortReview,
  idx: number,
  contentLocale: string,
): ReviewCanonical => ({
  id: asReviewId(`${EUROGIRLSESCORT_SOURCE}:review:${idx}`),
  authorNickname: raw.author,
  ratings: ZERO_RATINGS,
  averageRating: raw.rating,
  meetingPlace: 'incall',
  meetAgain: null,
  meetGood: raw.rating >= 3,
  liked: true,
  likedCount: 0,
  createdAt: parseEGEDate(raw.date) ?? new Date(0).toISOString(),
  text: i18nFromOriginal(raw.text ?? '', contentLocale),
  aspects: {},
});

// ============================================================================
// PersonalDetails
// ============================================================================

const mapPersonalDetails = async (
  payload: EuroGirlsEscortPayload,
  resolver: TaxonomyResolverPort,
): Promise<PersonalDetailsCanonical> => {
  const p = payload.params;

  const nationalitySlug = slugify(p.nationality);
  const ethnicSlug = slugify(p.ethnicity);
  const hairSlug = slugify(p.hairColor);
  const eyesSlug = slugify(p.eyes);
  const orientationSlug = slugify(p.orientation);

  const [nationalityId, ethnicId, hairId, eyesId, orientationId] = await Promise.all([
    nationalitySlug ? resolver.resolveNationality(nationalitySlug) : null,
    ethnicSlug ? resolver.resolveEthnic(ethnicSlug) : null,
    hairSlug ? resolver.resolveHair(hairSlug) : null,
    eyesSlug ? resolver.resolveEye(eyesSlug) : null,
    orientationSlug ? resolver.resolveOrientation(orientationSlug) : null,
  ]);

  return {
    ageYears: p.age ? parseInt(p.age, 10) : 0,
    gender: normalizeEGEGender(p.gender),
    heightCm: parseEGEHeightCm(p.height),
    weightKg: parseEGEWeightKg(p.weight),
    nationalityId: nationalityId ?? undefined,
    ethnicId: ethnicId ?? undefined,
    hairId: hairId ?? undefined,
    eyesId: eyesId ?? undefined,
    orientationId: orientationId ?? undefined,
    spokenLanguageCodes: [],
    meetingWith: parseEGEMeetingWith(p.meetingWith),
  };
};

// ============================================================================
// Entry point
// ============================================================================

export const mapEuroGirlsEscort = async (
  payload: EuroGirlsEscortPayload,
  resolver: TaxonomyResolverPort,
  options: MapperOptions = {},
): Promise<ScrapedProvider> => {
  const now = options.now ?? new Date();
  const contentLocale = options.contentLocale ?? 'en';

  const providerId = asProviderId(`${EUROGIRLSESCORT_SOURCE}:${payload.sourceId}`);

  // City + country resolution from slugs extracted via href
  const citySlug = payload.params.locationCitySlug;
  const countrySlug = payload.params.locationCountrySlug;

  const cityId = citySlug
    ? await resolver.resolveCity(citySlug, countrySlug?.slice(0, 2).toUpperCase())
    : null;

  const baseCity = cityId ? { id: cityId } : undefined;

  const verificationStatus: ProfileVerificationStatus = payload.verified
    ? 'verified'
    : 'pending_review';

  const externalRef: ExternalRef = {
    source: EUROGIRLSESCORT_SOURCE,
    sourceId: payload.sourceId,
    sourceUrl: payload.sourceUrl,
  };

  const personalDetails = await mapPersonalDetails(payload, resolver);

  const available = parseEGEAvailableFor(payload.params.availableFor);

  const allPrices: PriceCanonical[] = payload.rates.flatMap(mapRate);

  const hasVideo = payload.badges.some((b) => b.type === 'video');
  const isVip = payload.badges.some((b) => b.type === 'vip');
  const isPornstar = payload.badges.some((b) => b.type === 'pornstar');

  const primaryPhone = payload.phones.find((p) => !!p.number);

  return {
    // ---- Profile (canonical) ----
    id: providerId,
    vertical: 'dating',
    category: 'escorts',
    agencyId: undefined,
    nickname: payload.nickname,
    active: true,
    humanVerified: false,
    badges: {
      verified: payload.verified,
      trans: personalDetails.gender === 'trans',
      vip: isVip,
      pornstar: isPornstar,
    },
    verificationStatus,
    baseCity,
    currentCity: undefined,
    meetingPlaces: available,
    contactOptions: mapContactOptions(payload.phones),
    personalDetails,
    priceLabelType: undefined,
    prices: allPrices,
    aboutMe: payload.bio ? i18nFromOriginal(payload.bio, contentLocale) : undefined,
    serviceText: payload.params.servicesText
      ? i18nFromOriginal(payload.params.servicesText, contentLocale)
      : undefined,
    topTourText: undefined,
    tours: [],
    photos: payload.photos.map((p, i) => mapPhoto(p, i)),
    mainMedia: undefined,
    phoneNumber: primaryPhone?.number ? asPhoneE164(primaryPhone.number) : undefined,
    email: undefined,
    encodedPhoneNumber: primaryPhone?.dataPhone ?? undefined,
    encodedTelegram: undefined,
    links: {},
    otherPlatforms: [],
    reviewsEnabled: true,
    reviewsCount: payload.reviews.length,
    reviewsRating: payload.reviews.length
      ? payload.reviews.reduce((s, r) => s + r.rating, 0) / payload.reviews.length
      : 0,
    reviewsOverall: undefined,
    ratingDistributions: undefined,
    reviews: payload.reviews.map((r, i) => mapReview(r, i, contentLocale)),
    statistics: {
      photoCount: payload.photos.length,
      videoCount: hasVideo ? 1 : 0,
      tourCount: 0,
      isVip,
      isVerified: payload.verified,
    },
    lastActiveAt: parseEGEDate(payload.lastLoginDate),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),

    // ---- ScraperMeta ----
    externalRefs: [externalRef],
    signals: [],
    confidence: Confidence.high,
    images: [],
    attributes: {
      servicesIncluded: payload.services.filter((s) => s.included).map((s) => s.name),
      servicesExtra: payload.services.filter((s) => s.extra).map((s) => s.name),
      servicesText: payload.params.servicesText,
    },
    metadata: { source: EUROGIRLSESCORT_SOURCE, adapterVersion: 'v2' },
    lastScrapedAt: now.toISOString(),
  };
};
