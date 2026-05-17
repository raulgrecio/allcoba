/**
 * I18nText — primitive for every translatable text field.
 *
 * Captures the source language verbatim (`original`) and the translation
 * for a specific locale (`content`). Re-scrapes never overwrite `original`;
 * `content` is overwritable when a better translation arrives.
 *
 * See `I18N-MODEL.md` for the broader pattern.
 */

/** ISO-639-1 language code: `'es'`, `'en'`, `'fr'`, `'pt'`, … */
export type LocaleCode = string;

/** Sentinel for unknown source language. */
export const UNKNOWN_LOCALE: LocaleCode = '';

export interface I18nText {
  /** Text in source language. Immutable once captured. */
  readonly original: string;
  /** ISO-639-1 of `original`. `UNKNOWN_LOCALE` if not detected. */
  readonly originalLanguage: LocaleCode;
  /** Translation to `contentLocale`. `null` when identical to `original`. */
  readonly content: string | null;
  /** Locale of `content`. Equals `originalLanguage` when `content === null`. */
  readonly contentLocale: LocaleCode;
}

/** Build I18nText when the source provides only the original text. */
export const i18nFromOriginal = (
  original: string,
  originalLanguage: LocaleCode = UNKNOWN_LOCALE,
): I18nText => ({
  original,
  originalLanguage,
  content: null,
  contentLocale: originalLanguage,
});

/** Build I18nText when the source provides both original and translation. */
export const i18nFromPair = (
  original: string,
  originalLanguage: LocaleCode,
  content: string,
  contentLocale: LocaleCode,
): I18nText => {
  if (content === original && contentLocale === originalLanguage) {
    return i18nFromOriginal(original, originalLanguage);
  }
  return { original, originalLanguage, content, contentLocale };
};

/**
 * Resolve text for a locale request. Strategy:
 *   1. If `contentLocale === locale` and `content` is set → return `content`.
 *   2. If `originalLanguage === locale` → return `original`.
 *   3. Fallback to `content ?? original`.
 *
 * Translation on-demand is responsibility of the caller; this helper only
 * picks the best already-stored variant.
 */
export const resolveI18n = (text: I18nText, locale: LocaleCode): string => {
  if (text.contentLocale === locale && text.content !== null) return text.content;
  if (text.originalLanguage === locale) return text.original;
  return text.content ?? text.original;
};

/** Update only the translated side of an I18nText, keeping the original intact. */
export const withTranslation = (
  text: I18nText,
  content: string,
  contentLocale: LocaleCode,
): I18nText => ({
  ...text,
  content,
  contentLocale,
});

/** Two I18nText are equal when both original and stored translation match. */
export const i18nEquals = (a: I18nText, b: I18nText): boolean =>
  a.original === b.original &&
  a.originalLanguage === b.originalLanguage &&
  a.content === b.content &&
  a.contentLocale === b.contentLocale;

/** True when no translated content is stored — only the original. */
export const isOriginalOnly = (text: I18nText): boolean => text.content === null;
