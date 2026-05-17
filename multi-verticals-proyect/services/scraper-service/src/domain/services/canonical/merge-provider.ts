/**
 * mergeProvider — pure function merging two ScrapedProvider records.
 *
 * Semantics (mirror of legacy ScrapedProvider.merge()):
 *   - Existing wins: user-visible text, PII contact fields, geo base city.
 *   - Incoming wins: prices, verification status, current city, active flag.
 *   - Merge+dedup: photos, externalRefs, contactOptions, otherPlatforms, reviews.
 *   - Append: signals (audit trail — never discard).
 *   - Spread (incoming wins on conflict): attributes, metadata.
 */

import type {
  ContactOption,
  CrossPlatformLink,
  Iso2Code,
  PersonalDetailsCanonical,
  PhotoCanonical,
  ReviewCanonical,
} from '@allcoba/shared-types';
import { photoEquals as _photoEquals } from '@allcoba/shared-types';

import type { ProfileImage } from '../../canonical/profile-image.js';
import type { ScrapedProvider } from '../../canonical/scraped-provider.js';
import type { ExternalRef } from '../../canonical/external-ref.js';
import { externalRefEquals } from '../../canonical/external-ref.js';

export type MergeUpdate = Partial<ScrapedProvider>;

export function mergeProvider(existing: ScrapedProvider, incoming: MergeUpdate): ScrapedProvider {
  const now = new Date().toISOString();

  return {
    // ── Profile identity (immutable) ─────────────────────────────────────
    id: existing.id,
    vertical: existing.vertical,
    category: existing.category ?? incoming.category,
    agencyId: existing.agencyId ?? incoming.agencyId,

    // ── Display ──────────────────────────────────────────────────────────
    nickname: existing.nickname,
    active: incoming.active ?? existing.active,
    humanVerified: existing.humanVerified,
    badges: existing.badges,
    verificationStatus: incoming.verificationStatus ?? existing.verificationStatus,

    // ── Geo ──────────────────────────────────────────────────────────────
    baseCity: existing.baseCity ?? incoming.baseCity,
    currentCity: incoming.currentCity ?? existing.currentCity,
    addressText: existing.addressText ?? incoming.addressText,

    // ── Meeting ───────────────────────────────────────────────────────────
    meetingPlaces: incoming.meetingPlaces ?? existing.meetingPlaces,
    contactOptions: mergeContactOptions(existing.contactOptions, incoming.contactOptions),

    // ── Personal details ──────────────────────────────────────────────────
    personalDetails: mergePersonalDetails(existing.personalDetails, incoming.personalDetails),

    // ── Prices (latest wins) ───────────────────────────────────────────────
    priceLabelType: incoming.priceLabelType ?? existing.priceLabelType,
    prices: incoming.prices ?? existing.prices,

    // ── Text content (existing wins — may be manually edited) ─────────────
    aboutMe: existing.aboutMe ?? incoming.aboutMe,
    serviceText: existing.serviceText ?? incoming.serviceText,
    topTourText: existing.topTourText ?? incoming.topTourText,
    tours: incoming.tours ?? existing.tours,

    // ── Media ─────────────────────────────────────────────────────────────
    photos: mergePhotos(existing.photos, incoming.photos),
    mainMedia: incoming.mainMedia ?? existing.mainMedia,

    // ── PII contact (existing wins) ───────────────────────────────────────
    phoneNumber: existing.phoneNumber ?? incoming.phoneNumber,
    email: existing.email ?? incoming.email,
    encodedPhoneNumber: existing.encodedPhoneNumber ?? incoming.encodedPhoneNumber,
    encodedTelegram: existing.encodedTelegram ?? incoming.encodedTelegram,
    links: incoming.links ?? existing.links,
    otherPlatforms: mergeOtherPlatforms(existing.otherPlatforms, incoming.otherPlatforms),

    // ── Reviews (aggregates: incoming wins; list: merge+dedup) ────────────
    reviewsEnabled: incoming.reviewsEnabled ?? existing.reviewsEnabled,
    reviewsCount: incoming.reviewsCount ?? existing.reviewsCount,
    reviewsRating: incoming.reviewsRating ?? existing.reviewsRating,
    reviewsOverall: incoming.reviewsOverall ?? existing.reviewsOverall,
    ratingDistributions: incoming.ratingDistributions ?? existing.ratingDistributions,
    reviews: mergeReviews(existing.reviews, incoming.reviews),

    // ── Statistics ────────────────────────────────────────────────────────
    statistics: incoming.statistics ?? existing.statistics,

    // ── Timestamps ────────────────────────────────────────────────────────
    lastActiveAt: latestIso(existing.lastActiveAt, incoming.lastActiveAt),
    createdAt: existing.createdAt,
    updatedAt: now,

    // ── ScraperMeta ───────────────────────────────────────────────────────
    externalRefs: mergeExternalRefs(existing.externalRefs, incoming.externalRefs),
    signals: [
      ...existing.signals,
      ...(incoming.signals ?? []),
    ],
    confidence: incoming.confidence ?? existing.confidence,
    images: mergeImages(existing.images, incoming.images),
    attributes: { ...existing.attributes, ...incoming.attributes },
    metadata: {
      ...existing.metadata,
      ...incoming.metadata,
      lastMergedAt: now,
    },
    lastScrapedAt: incoming.lastScrapedAt ?? now,
  };
}

// ── helpers ──────────────────────────────────────────────────────────────────

function mergeExternalRefs(
  existing: readonly ExternalRef[],
  incoming: readonly ExternalRef[] | undefined,
): readonly ExternalRef[] {
  if (!incoming?.length) return existing;
  const novel = incoming.filter((r) => !existing.some((e) => externalRefEquals(e, r)));
  return [...existing, ...novel];
}

function mergePhotos(
  existing: readonly PhotoCanonical[],
  incoming: readonly PhotoCanonical[] | undefined,
): readonly PhotoCanonical[] {
  if (!incoming?.length) return existing;
  const novel = incoming.filter((p) => !existing.some((e) => _photoEquals(e, p)));
  return [...existing, ...novel];
}

function mergeImages(
  existing: readonly ProfileImage[],
  incoming: readonly ProfileImage[] | undefined,
): readonly ProfileImage[] {
  if (!incoming?.length) return existing;
  const existingHashes = new Set(existing.map((i) => i.hash));
  const novel = incoming.filter((i) => !existingHashes.has(i.hash));
  return [...existing, ...novel];
}

function mergeContactOptions(
  existing: readonly ContactOption[],
  incoming: readonly ContactOption[] | undefined,
): readonly ContactOption[] {
  if (!incoming?.length) return existing;
  const set = new Set<ContactOption>(existing);
  for (const c of incoming) set.add(c);
  return [...set];
}

function mergeOtherPlatforms(
  existing: readonly CrossPlatformLink[],
  incoming: readonly CrossPlatformLink[] | undefined,
): readonly CrossPlatformLink[] {
  if (!incoming?.length) return existing;
  const existingUrls = new Set(existing.map((p) => p.url));
  const novel = incoming.filter((p) => !existingUrls.has(p.url));
  return [...existing, ...novel];
}

function mergeReviews(
  existing: readonly ReviewCanonical[],
  incoming: readonly ReviewCanonical[] | undefined,
): readonly ReviewCanonical[] {
  if (!incoming?.length) return existing;
  const existingIds = new Set(existing.map((r) => r.id));
  const novel = incoming.filter((r) => !existingIds.has(r.id));
  return [...existing, ...novel];
}

function mergePersonalDetails(
  existing: PersonalDetailsCanonical,
  incoming: Partial<PersonalDetailsCanonical> | undefined,
): PersonalDetailsCanonical {
  if (!incoming) return existing;

  const langs = mergeLanguageCodes(existing.spokenLanguageCodes, incoming.spokenLanguageCodes);

  return {
    ageYears: incoming.ageYears ?? existing.ageYears,
    heightCm: existing.heightCm ?? incoming.heightCm,
    weightKg: existing.weightKg ?? incoming.weightKg,
    bustCm: existing.bustCm ?? incoming.bustCm,
    hipCm: existing.hipCm ?? incoming.hipCm,
    waistCm: existing.waistCm ?? incoming.waistCm,
    nationalityId: existing.nationalityId ?? incoming.nationalityId,
    ethnicId: existing.ethnicId ?? incoming.ethnicId,
    hairId: existing.hairId ?? incoming.hairId,
    eyesId: existing.eyesId ?? incoming.eyesId,
    orientationId: existing.orientationId ?? incoming.orientationId,
    spokenLanguageCodes: langs,
    meetingWith: incoming.meetingWith ?? existing.meetingWith,
    drink: existing.drink ?? incoming.drink,
    music: existing.music ?? incoming.music,
    hobby: existing.hobby ?? incoming.hobby,
  };
}

function mergeLanguageCodes(
  existing: readonly Iso2Code[],
  incoming: readonly Iso2Code[] | undefined,
): readonly Iso2Code[] {
  if (!incoming?.length) return existing;
  const set = new Set<Iso2Code>(existing);
  for (const c of incoming) set.add(c);
  return [...set];
}

function latestIso(a: string | undefined, b: string | undefined): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}
