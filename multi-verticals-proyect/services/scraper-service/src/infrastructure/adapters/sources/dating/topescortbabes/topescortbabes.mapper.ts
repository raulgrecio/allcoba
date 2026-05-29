import type {
  CityRef,
  ContactOption,
  CurrencyCode,
  I18nText,
  Iso2Code,
  PersonalDetailsCanonical,
  PriceCanonical,
  ProfileVerificationStatus,
  RatingDistribution,
  RatingDistributions,
  ReviewCanonical,
  ReviewsOverallCanonical,
  ReviewSubratings,
  ReviewSubratingsPartial,
  ReviewTagCanonical,
} from '@allcoba/shared-types';
import {
  asAgencyId,
  asIso2,
  asProviderId,
  asReviewId,
  i18nFromOriginal,
  i18nFromPair,
} from '@allcoba/shared-types';

import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';
import type { ExternalRef } from '#domain/canonical/external-ref.js';
import type { ScrapedPhoto } from '#domain/canonical/scraped-photo.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';
import { Confidence } from '#domain/canonical/confidence.js';

import type {
  CityRecord,
  Photo,
  Price,
  Review,
  SchemaPerson,
  TopEscortBabesPayload,
} from './topescortbabes.types.js';
import {
  extractTaxonomySlug,
  labelToPriceSlot,
  normalizeContactOption,
  normalizeGender,
  parseHeightCm,
  parseHumanDateEs,
  parseMeetingWith,
  parseRelativeTimeEs,
  parseWeightKg,
} from './topescortbabes.parsers.js';

/**
 * TopEscortBabesMapper — pure mapping from raw payload to ScrapedProvider v2.
 *
 * Dependency inversion: the mapper depends on a TaxonomyResolverPort to turn
 * source slugs into canonical catalog ids. The mapper itself is pure (no I/O,
 * no DB, no clock except injected). Tests inject a FakeTaxonomyResolver.
 *
 * Preference order for any single canonical field:
 *   1. pageSchema."@graph" (Schema.org — most stable, internationally clean)
 *   2. root payload fields (typed and direct)
 *   3. personalDetails HTML (slug extraction from <a href>)
 *
 * Source-only fields (encodedPhoneNumber, trackHash, internalLinks…) are
 * intentionally dropped. SEO/page fields (faqs, breadcrumb, moreLinks, meta*)
 * are NOT mapped here — they belong to a separate PageI18n mapping.
 */

export const TOPESCORTBABES_SOURCE = 'topescortbabes';

export interface MapperOptions {
  /** Clock injection — relative time strings ("hace 4 días") use this. */
  readonly now?: Date;
  /** Locale of the response payload (Spanish in the captured fixtures). */
  readonly contentLocale?: string;
}

// ============================================================================
// Helpers
// ============================================================================

const findSchemaPerson = (payload: TopEscortBabesPayload): SchemaPerson | undefined => {
  const graph = payload.pageSchema?.['@graph'];
  if (!Array.isArray(graph)) return undefined;
  return graph.find((n): n is SchemaPerson => n['@type'] === 'Person');
};

const toNumberOrUndefined = (s: string | undefined | null): number | undefined => {
  if (s === undefined || s === null || s === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

const buildCityRef = async (
  raw: CityRecord | undefined,
  resolver: TaxonomyResolverPort,
): Promise<CityRef | undefined> => {
  if (!raw) return undefined;
  const countryIso2 = raw.country.iso2;
  const cityId = await resolver.resolveCity(raw.url_segment, countryIso2);
  const countryId = await resolver.resolveCountry(countryIso2);
  if (!cityId || !countryId) return undefined;
  return {
    id: cityId,
    slug: raw.url_segment,
    countryId,
    lat: toNumberOrUndefined(raw.lat),
    lng: toNumberOrUndefined(raw.lng),
  };
};

const buildAboutMe = (
  payload: TopEscortBabesPayload,
  contentLocale: string,
): I18nText | undefined => {
  const am = payload.aboutMe;
  if (!am) return undefined;
  const original = am.original;
  const originalLanguage = am.original_language || '';
  if (!original) return undefined;
  if (am.content && am.content !== original) {
    return i18nFromPair(original, originalLanguage, am.content, contentLocale);
  }
  return i18nFromOriginal(original, originalLanguage);
};

const mapPhoto = (raw: Photo, idx: number): ScrapedPhoto => ({
  id: `topescortbabes:photo:${idx}`,
  url: raw.path,
  thumbnail: raw.thumbnail || undefined,
  isPrimary: idx === 0,
  isVerified: !!raw.verification_level,
  order: idx,
});

const mapPrice = (raw: Price): PriceCanonical => {
  const amount = Number(raw.price);
  return {
    slot: labelToPriceSlot(raw.label),
    amount: Number.isFinite(amount) ? amount : 0,
    currency: raw.currency as CurrencyCode,
  };
};

const mapContactOptions = (raw: readonly string[] | undefined): readonly ContactOption[] => {
  if (!raw) return [];
  const out: ContactOption[] = [];
  for (const r of raw) {
    const c = normalizeContactOption(r);
    if (c) out.push(c);
  }
  return out;
};

const mapReviewSubratings = (r: Review['ratings'] | null | undefined): ReviewSubratings => {
  if (!r) {
    return {
      place: 0,
      punctuality: 0,
      looks: 0,
      attitude: 0,
      services: 0,
      photosAccuracy: 0,
    };
  }
  return {
    place: Number(r.place),
    punctuality: Number(r.punctuality),
    looks: Number(r.looks),
    attitude: Number(r.attitude),
    services: Number(r.services),
    photosAccuracy: Number(r.photos_accuracy),
  };
};

const mapReview = (raw: Review, contentLocale: string): ReviewCanonical => {
  const text: I18nText =
    raw.review && raw.review !== raw.review_original
      ? i18nFromPair(raw.review_original, raw.review_language || '', raw.review, contentLocale)
      : i18nFromOriginal(raw.review_original ?? '', raw.review_language || '');

  const aspects: ReviewCanonical['aspects'] = {
    ...(raw.contact_text ? { contact: i18nFromOriginal(raw.contact_text) } : {}),
    ...(raw.appearance_text ? { appearance: i18nFromOriginal(raw.appearance_text) } : {}),
    ...(raw.attitude_text ? { attitude: i18nFromOriginal(raw.attitude_text) } : {}),
    ...(raw.experience_text ? { experience: i18nFromOriginal(raw.experience_text) } : {}),
    ...(raw.satisfaction_text ? { satisfaction: i18nFromOriginal(raw.satisfaction_text) } : {}),
  };

  return {
    id: asReviewId(raw.id),
    authorNickname: raw.nickname,
    meetCountryIso2: raw.iso2 ? asIso2(raw.iso2) : undefined,
    ratings: mapReviewSubratings(raw.ratings),
    averageRating: raw.average_rating ?? 0,
    meetingPlace: (raw.meeting_place ?? '').toLowerCase().includes('incall') ? 'incall' : 'outcall',
    meetAgain: !raw.meet_again
      ? null
      : /reservado|repet/i.test(raw.meet_again)
        ? true
        : /no.*volver|no.*lo|nunca/i.test(raw.meet_again)
          ? false
          : null,
    meetGood: raw.meet_good,
    liked: raw.liked,
    likedCount: raw.liked_count,
    createdAt: parseRelativeTimeEs(raw.review_date) ?? new Date(0).toISOString(),
    text,
    aspects,
  };
};

const mapReviewSubratingsPartial = (
  r: NonNullable<TopEscortBabesPayload['reviewsOverall']>['average_ratings'],
): ReviewSubratingsPartial | null => {
  if (!r) return null;
  return {
    place: r.place === null ? null : Number(r.place),
    punctuality: r.punctuality === null ? null : Number(r.punctuality),
    looks: r.looks === null ? null : Number(r.looks),
    attitude: r.attitude === null ? null : Number(r.attitude),
    services: r.services === null ? null : Number(r.services),
    photosAccuracy: r.photos_accuracy === null ? null : Number(r.photos_accuracy),
  };
};

const mapTagCode = (raw: { text: string }): string =>
  raw.text
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

const mapReviewsOverall = (
  raw: TopEscortBabesPayload['reviewsOverall'],
): ReviewsOverallCanonical => ({
  count: raw.count,
  tags: raw.tags.map(
    (t): ReviewTagCanonical => ({
      code: mapTagCode(t),
      count: t.count,
      positive: t.positive,
    }),
  ),
  averageRatings: mapReviewSubratingsPartial(raw.average_ratings),
  meetAgainPercentage: raw.meet_again_percentage,
  newReviewsCount: raw.new_reviews_count,
  hasOldReview: raw.has_old_review,
});

const mapDistribution = (raw: RatingDistribution | null | undefined): RatingDistribution | null => {
  if (!raw) return null;
  return {
    distribution: raw.distribution,
    percentageDistribution: (raw as unknown as { percentage_distribution: Record<string, number> })
      .percentage_distribution as Readonly<Record<string, number>>,
    totalRatings: (raw as unknown as { total_ratings: number }).total_ratings,
    averageRating: (raw as unknown as { average_rating: number }).average_rating,
  };
};

const mapRatingDistributions = (
  raw: TopEscortBabesPayload['ratingDistributions'],
): RatingDistributions | undefined => {
  if (!raw) return undefined;
  return {
    overall: mapDistribution(raw.overall as unknown as RatingDistribution | null),
    place: mapDistribution(raw.place as unknown as RatingDistribution | null),
    punctuality: mapDistribution(raw.punctuality as unknown as RatingDistribution | null),
    looks: mapDistribution(raw.looks as unknown as RatingDistribution | null),
    attitude: mapDistribution(raw.attitude as unknown as RatingDistribution | null),
    services: mapDistribution(raw.services as unknown as RatingDistribution | null),
    photosAccuracy: mapDistribution(raw.photos_accuracy as unknown as RatingDistribution | null),
  };
};

// ============================================================================
// PersonalDetails mapping (Schema.org-first with HTML fallback)
// ============================================================================

const mapPersonalDetails = async (
  payload: TopEscortBabesPayload,
  resolver: TaxonomyResolverPort,
): Promise<PersonalDetailsCanonical> => {
  const person = findSchemaPerson(payload);
  const pd = payload.personalDetails;

  const ageYears = Number(payload.age);
  const heightCm =
    person?.height?.unitText === 'cm' ? Number(person.height.value) : parseHeightCm(pd?.height);
  const weightKg =
    person?.weight?.unitText === 'kg' ? Number(person.weight.value) : parseWeightKg(pd?.weight);

  const nationalitySlug = extractTaxonomySlug(pd?.nationality, 'nationality');
  const ethnicSlug = extractTaxonomySlug(pd?.ethnic, 'ethnic');
  const hairSlug = extractTaxonomySlug(pd?.hair, 'hair');
  const eyesSlug = extractTaxonomySlug(pd?.eyes, 'eyes');
  const orientationSlug = extractTaxonomySlug(pd?.orientation, 'sexuality');

  const nationalityId = nationalitySlug ? await resolver.resolveNationality(nationalitySlug) : null;
  const ethnicId = ethnicSlug ? await resolver.resolveEthnic(ethnicSlug) : null;
  const hairId = hairSlug ? await resolver.resolveHair(hairSlug) : null;
  const eyesId = eyesSlug ? await resolver.resolveEye(eyesSlug) : null;
  const orientationId = orientationSlug ? await resolver.resolveOrientation(orientationSlug) : null;

  const spokenLanguageCodes: Iso2Code[] = [];
  if (person?.knowsLanguage) {
    for (const l of person.knowsLanguage) {
      if (l.alternateName) spokenLanguageCodes.push(asIso2(l.alternateName));
    }
  }

  const meetingWith = parseMeetingWith(pd?.meetingWith);
  const gender = normalizeGender(person?.gender, payload.badges);

  return {
    ageYears: Number.isFinite(ageYears) ? ageYears : 0,
    gender,
    heightCm,
    weightKg,
    bustCm: toNumberOrUndefined(pd?.bust),
    hipCm: toNumberOrUndefined(pd?.hip),
    waistCm: toNumberOrUndefined(pd?.waist),
    nationalityId: nationalityId ?? undefined,
    ethnicId: ethnicId ?? undefined,
    hairId: hairId ?? undefined,
    eyesId: eyesId ?? undefined,
    orientationId: orientationId ?? undefined,
    spokenLanguageCodes,
    meetingWith,
    drink: pd?.drink ? i18nFromOriginal(pd.drink) : undefined,
    music: pd?.music ? i18nFromOriginal(pd.music) : undefined,
    hobby: pd?.hobby ? i18nFromOriginal(pd.hobby) : undefined,
  };
};

// ============================================================================
// Entry point
// ============================================================================

export const mapTopEscortBabes = async (
  payload: TopEscortBabesPayload,
  resolver: TaxonomyResolverPort,
  options: MapperOptions = {},
): Promise<ScrapedProvider> => {
  const now = options.now ?? new Date();
  const contentLocale = options.contentLocale ?? 'es';

  const providerId = asProviderId(`${TOPESCORTBABES_SOURCE}:${payload.id}`);

  const baseCity = await buildCityRef(payload.baseCity, resolver);
  const currentCity = await buildCityRef(payload.currentCity, resolver);

  const verificationStatus: ProfileVerificationStatus = payload.badges?.verified
    ? 'verified'
    : 'pending_review';

  const externalRef: ExternalRef = {
    source: TOPESCORTBABES_SOURCE,
    sourceId: String(payload.id),
    sourceUrl: payload.canonical,
  };

  const personalDetails = await mapPersonalDetails(payload, resolver);

  return {
    // ---- Profile (canonical) ----
    id: providerId,
    vertical: 'dating',
    category: payload.category as 'escorts',
    agencyId: payload.agencyId > 0 ? asAgencyId(String(payload.agencyId)) : undefined,
    nickname: payload.nickname,
    active: payload.active,
    humanVerified: payload.humanVerified,
    badges: {
      verified: !!payload.badges?.verified,
      trans: !!payload.badges?.trans,
      vip: !!payload.badges?.vip,
      pornstar: !!payload.badges?.pornstar,
    },
    verificationStatus,
    baseCity,
    currentCity,
    meetingPlaces: {
      incall: !!payload.meetingPlaces?.incall,
      outcall: !!payload.meetingPlaces?.outcall,
    },
    contactOptions: mapContactOptions(payload.contactOptions),
    personalDetails,
    priceLabelType: payload.priceLabelType ?? undefined,
    prices: (payload.prices ?? []).map(mapPrice),
    aboutMe: buildAboutMe(payload, contentLocale),
    serviceText: payload.serviceText ? i18nFromOriginal(payload.serviceText) : undefined,
    topTourText: payload.topTourText ? i18nFromOriginal(payload.topTourText) : undefined,
    tours: [],
    photos: (payload.photos ?? []).map((p, i) => mapPhoto(p, i)),
    mainMedia: payload.mainMedia
      ? {
          type: payload.mainMedia.type,
          path: payload.mainMedia.path,
          poster: payload.mainMedia.poster,
          fallback: payload.mainMedia.fallback,
          orientation: payload.mainMedia.orientation,
          width: Number(payload.mainMedia.width),
          height: Number(payload.mainMedia.height),
          smallImage: payload.mainMedia.small_image,
        }
      : undefined,
    phoneNumber: undefined,
    email: undefined,
    encodedPhoneNumber: payload.encodedPhoneNumber || undefined,
    encodedTelegram: payload.encodedTelegram || undefined,
    links: { website: payload.links?.website ?? undefined },
    otherPlatforms: (payload.otherPlatforms ?? []).map((p) => ({
      platform: p.name,
      url: p.url,
    })),
    reviewsEnabled: payload.reviewEnabled,
    reviewsCount: payload.reviewsCount,
    reviewsRating: payload.reviewsRating,
    reviewsOverall: payload.reviewsOverall ? mapReviewsOverall(payload.reviewsOverall) : undefined,
    ratingDistributions: mapRatingDistributions(payload.ratingDistributions),
    reviews: (payload.reviews ?? []).map((r) => mapReview(r, contentLocale)),
    statistics: payload.statisticsData
      ? {
          photoCount: payload.statisticsData.pic,
          videoCount: payload.statisticsData.vid,
          tourCount: payload.statisticsData.tour,
          isVip: payload.statisticsData.vip === 1,
          isVerified: payload.statisticsData.ver === 1,
          agencyId:
            payload.statisticsData.ab > 0
              ? asAgencyId(String(payload.statisticsData.ab))
              : undefined,
        }
      : undefined,
    lastActiveAt: parseRelativeTimeEs(payload.lastActive, now),
    createdAt: now.toISOString(),
    updatedAt: parseHumanDateEs(payload.updatedAt) ?? now.toISOString(),

    // ---- ScraperMeta ----
    externalRefs: [externalRef],
    signals: [],
    confidence: Confidence.high,
    images: [],
    attributes: {
      minimumPrice: payload.minimumPrice || undefined,
    },
    metadata: { source: TOPESCORTBABES_SOURCE, adapterVersion: 'v2' },
    lastScrapedAt: now.toISOString(),
  };
};
