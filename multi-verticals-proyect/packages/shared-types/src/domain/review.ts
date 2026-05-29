/**
 * Review canonical model — separates numeric ratings (canonical) from
 * narrative text (I18nText). Subratings and distributions stay as numbers.
 */

import type { Iso2Code, MeetingPlace } from '../primitives/enums.js';
import type { I18nText } from '../primitives/i18n-text.js';
import type { CityId, ReviewId } from '../primitives/identity.js';

export interface ReviewSubratings {
  readonly place: number;
  readonly punctuality: number;
  readonly looks: number;
  readonly attitude: number;
  readonly services: number;
  readonly photosAccuracy: number;
}

export type ReviewSubratingsPartial = {
  readonly [K in keyof ReviewSubratings]: number | null;
};

export interface ReviewTagCanonical {
  /** Stable code — labels live in `enum_labels` under `enum_name='ReviewTag'`. */
  readonly code: string;
  readonly count: number;
  readonly positive: boolean;
}

export interface ReviewsOverallCanonical {
  readonly count: number;
  readonly tags: readonly ReviewTagCanonical[];
  readonly averageRatings: ReviewSubratingsPartial | null;
  /** 0..100. */
  readonly meetAgainPercentage: number | null;
  readonly newReviewsCount: number;
  readonly hasOldReview: boolean;
}

/** Discrete rating distribution 1..10. */
export type RatingDistribution = {
  readonly distribution: Readonly<Record<string, number>>;
  readonly percentageDistribution: Readonly<Record<string, number>>;
  readonly totalRatings: number;
  readonly averageRating: number;
};

export interface RatingDistributions {
  readonly overall: RatingDistribution | null;
  readonly place: RatingDistribution | null;
  readonly punctuality: RatingDistribution | null;
  readonly looks: RatingDistribution | null;
  readonly attitude: RatingDistribution | null;
  readonly services: RatingDistribution | null;
  readonly photosAccuracy: RatingDistribution | null;
}

export interface ReviewCanonical {
  readonly id: ReviewId;
  readonly authorNickname: string;
  readonly meetCityId?: CityId;
  readonly meetCountryIso2?: Iso2Code;
  readonly ratings: ReviewSubratings;
  readonly averageRating: number;
  readonly meetingPlace: MeetingPlace;
  /** null = unknown, true/false = explicit answer. */
  readonly meetAgain: boolean | null;
  readonly meetGood: boolean;
  readonly liked: boolean;
  readonly likedCount: number;
  /** ISO-8601 UTC. */
  readonly createdAt: string;
  /** Main narrative — original + translation, when present. */
  readonly text: I18nText;
  /** Per-aspect free text, all I18nText. */
  readonly aspects: {
    readonly contact?: I18nText;
    readonly appearance?: I18nText;
    readonly attitude?: I18nText;
    readonly experience?: I18nText;
    readonly satisfaction?: I18nText;
  };
}
