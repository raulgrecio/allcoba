/**
 * Profile — root aggregate of the canonical marketplace domain.
 *
 * Pure: contains only data the marketplace itself cares about. No scraper
 * provenance, no entity-resolution metadata. Scraper-only extensions
 * (`ExternalRef`, `Confidence`, `ScraperSignal`, audit fields, `ScrapedProvider`)
 * live in `services/scraper-service/src/domain/canonical/`.
 *
 * Direction of dependency:
 *   - any service may import `Profile` from here.
 *   - this module never imports from any service.
 */

import type { CityRef } from '../catalog/geo.js';
import type {
  Category,
  ContactOption,
  PriceLabelType,
  ProfileVerificationStatus,
  Vertical,
} from '../primitives/enums.js';
import type { I18nText } from '../primitives/i18n-text.js';
import type { AgencyId, CityId, ProviderId } from '../primitives/identity.js';
import type { MainMediaCanonical, PhotoCanonical } from './media.js';
import type { Email, PersonalDetailsCanonical, PhoneE164 } from './personal-details.js';
import type { PriceCanonical } from './price.js';
import type { RatingDistributions, ReviewCanonical, ReviewsOverallCanonical } from './review.js';

export interface Badges {
  readonly verified: boolean;
  readonly trans: boolean;
  readonly vip: boolean;
  readonly pornstar: boolean;
}

export interface MeetingPlaces {
  readonly incall: boolean;
  readonly outcall: boolean;
}

export interface Tour {
  readonly cityId?: CityId;
  /** ISO-8601. */
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

export interface ProfileLinks {
  readonly website?: string;
}

/** Same-group profile duplicated on another platform. */
export interface CrossPlatformLink {
  /** Stable name code — label in `enum_labels` if displayed. */
  readonly platform: string;
  readonly url: string;
}

export interface ProfileStatisticsCanonical {
  readonly photoCount: number;
  readonly videoCount: number;
  readonly tourCount: number;
  readonly isVip: boolean;
  readonly isVerified: boolean;
  readonly agencyId?: AgencyId;
}

/**
 * Profile — language-invariant canonical shape. Any localized text is
 * either `I18nText` (carrying original + translation) or resolved through
 * `entity_translations` / `enum_labels` at hydration time.
 */
export interface Profile {
  readonly id: ProviderId;
  readonly vertical: Vertical;
  readonly category?: Category;
  readonly agencyId?: AgencyId;

  /** Display name as captured. Not localized in practice. */
  readonly nickname: string;
  readonly active: boolean;
  readonly humanVerified: boolean;
  readonly badges: Badges;
  readonly verificationStatus: ProfileVerificationStatus;

  /** Geo — refs into the catalog. */
  readonly baseCity?: CityRef;
  readonly currentCity?: CityRef;
  /** Free-form address text — translatable when present. */
  readonly addressText?: I18nText;

  readonly meetingPlaces: MeetingPlaces;
  readonly contactOptions: readonly ContactOption[];

  readonly personalDetails: PersonalDetailsCanonical;

  readonly priceLabelType?: PriceLabelType;
  readonly prices: readonly PriceCanonical[];

  /** Narrative + service description — translatable. */
  readonly aboutMe?: I18nText;
  readonly serviceText?: I18nText;
  readonly topTourText?: I18nText;
  readonly tours: readonly Tour[];

  readonly photos: readonly PhotoCanonical[];
  readonly mainMedia?: MainMediaCanonical;

  /** Contacts — PII, never log. */
  readonly phoneNumber?: PhoneE164;
  readonly email?: Email;
  readonly encodedPhoneNumber?: string;
  readonly encodedTelegram?: string;
  readonly links: ProfileLinks;
  readonly otherPlatforms: readonly CrossPlatformLink[];

  readonly reviewsEnabled: boolean;
  readonly reviewsCount: number;
  readonly reviewsRating: number;
  readonly reviewsOverall?: ReviewsOverallCanonical;
  readonly ratingDistributions?: RatingDistributions;
  readonly reviews: readonly ReviewCanonical[];

  readonly statistics?: ProfileStatisticsCanonical;

  /** ISO-8601 UTC timestamps. */
  readonly lastActiveAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
