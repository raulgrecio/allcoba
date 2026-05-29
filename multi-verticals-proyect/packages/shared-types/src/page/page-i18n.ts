/**
 * Page / SEO localized payload — produced by the adapter, persisted in
 * `page_translations` keyed by `(entity_type, entity_id, locale)`.
 *
 * Schema.org graph is NOT persisted: it's regenerated in the front from
 * the canonical model + locale. Stored here only if a SEO snapshot is
 * explicitly required, as an opaque `pageSchema` JSON.
 */

import type { BreadcrumbTag, FaqKey, MoreLinkRefType } from '../primitives/enums.js';
import type { I18nText, LocaleCode } from '../primitives/i18n-text.js';
import type { EntityId } from '../primitives/identity.js';

export interface FaqCanonical {
  readonly key: FaqKey;
  readonly title: I18nText;
  readonly content: I18nText;
}

export interface BreadcrumbCanonical {
  readonly tag: BreadcrumbTag;
  /** FK to the canonical entity (country/city/profile) when applicable. */
  readonly refId?: EntityId;
  readonly url: string;
  readonly label: I18nText;
}

export interface MoreLinkCanonical {
  readonly link: string;
  readonly refType?: MoreLinkRefType;
  readonly refId?: EntityId;
  readonly label: I18nText;
}

/**
 * SEO/page payload for a single locale. One row per (profileId, locale).
 */
export interface PageI18n {
  readonly locale: LocaleCode;
  readonly metaTitle?: string;
  readonly metaDescription?: string;
  readonly metaImage?: string;
  readonly aiTitle?: string;
  readonly logoTitle?: string;
  readonly galleryImgAlt?: string;
  readonly locationName?: string;
  readonly locationUrl?: string;
  readonly reviewPageHeaderTitle?: string;
  readonly reviewPageFooterText?: string;
  readonly minimumPriceLabel?: string;
  readonly serviceText?: I18nText;
  readonly breadcrumb: readonly BreadcrumbCanonical[];
  readonly faqs: readonly FaqCanonical[];
  readonly moreLinks: readonly MoreLinkCanonical[];
  readonly preloadImages: readonly string[];
  /** Opaque schema.org snapshot — only when needed for SEO export. */
  readonly pageSchema?: unknown;
}
