/**
 * Closed-vocabulary enums for the canonical domain.
 *
 * Values are **stable code literals**, never localized labels.
 * Labels for each code live in `enum_labels` keyed by `(enum_name, code, locale)`.
 *
 * Scraper-only enums (`SignalType`) live in
 * `services/scraper-service/src/domain/canonical/` — not here.
 */

import type { Brand } from './identity.js';

/** ISO-3166-1 alpha-2 uppercase: `'ES'`, `'FR'`. Normalize at boundary. */
export type Iso2Code = Brand<string, 'Iso2Code'>;

export const asIso2 = (raw: string): Iso2Code => raw.toUpperCase() as Iso2Code;

/** Verticales soportadas por el marketplace. */
export type Vertical = 'dating' | 'massage' | 'motor' | 'real-estate' | 'general';

/** Sub-categoría dentro de la vertical (fuente-dependiente). */
export type Category =
  | 'escorts'
  | 'erotic-massage'
  | 'cars'
  | 'motorbikes'
  | 'rental'
  | 'sale'
  | 'general-listing';

export type ContactOption = 'calls' | 'sms' | 'whatsapp' | 'telegram';

export type CurrencyCode =
  | 'EUR'
  | 'GBP'
  | 'USD'
  | 'AED'
  | 'CHF'
  | 'JPY'
  | 'CAD'
  | 'AUD'
  | 'MXN'
  | 'BRL';

/** Price duration slot. Label per locale lives in `enum_labels`. */
export type PriceSlot = 'h1' | 'h2' | 'h3' | 'h12' | 'h24' | 'overnight' | 'custom';

/** Modifier on the price label (e.g. "from"). */
export type PriceLabelType = 'lower' | 'upper' | 'exact';

export type MeetingWith = 'man' | 'woman' | 'couple' | 'group' | 'other';

export type MeetingPlace = 'incall' | 'outcall' | 'event' | 'other';

export type Orientation = 'hetero' | 'bi' | 'lesbian' | 'gay' | 'other';

export type HairColor = 'brown' | 'blonde' | 'black' | 'red' | 'gray' | 'white' | 'dyed' | 'other';

export type EyeColor = 'brown' | 'blue' | 'green' | 'gray' | 'hazel' | 'amber' | 'other';

export type MediaType = 'image' | 'video';

export type MediaOrientation = 'landscape' | 'portrait' | 'square';

/**
 * Photo verification level — encoding observed in some sources:
 *  -1 = not verified, 1 = looked similar, 2 = looked slightly different
 */
export type PhotoVerificationLevel = -1 | 1 | 2;

export type ProfileVerificationStatus = 'pending_review' | 'verified' | 'rejected' | 'expired';

/** Canonical key of FAQs commonly emitted by sources. */
export type FaqKey =
  | 'how_can_book'
  | 'what_languages_spoken'
  | 'where_can_meet'
  | 'photos_verified';

/** Tag used in breadcrumb element identification. */
export type BreadcrumbTag = 'home' | 'country' | 'city' | 'category' | 'vertical' | 'profile';

/** Target type of a moreLinks navigation entry. */
export type MoreLinkRefType = 'city' | 'country' | 'category' | 'vertical' | 'profile';
