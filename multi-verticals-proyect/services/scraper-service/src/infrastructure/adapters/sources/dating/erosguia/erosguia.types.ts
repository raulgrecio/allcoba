/**
 * Erosguia — raw payload model.
 *
 * Technology: Laravel + Alpine.js + Tailwind v4 (SSR — all content in static HTML).
 * Two data-position panels (desktop=hidden, responsive=visible) with identical data.
 * All field extraction is scoped to [data-position="responsive"] to avoid duplicates.
 *
 * Data layers:
 *   PROFILE  → nickname, bio, phone (title), whatsapp, telegram, photos
 *   ATTRS    → city, nationality, age, heightCm, languages
 *   SERVICES → hobby/service tags from the "Aficiones" panel
 *   PAGE     → sourceId (numeric), sourceUrl
 */

export interface ErosguiaPhoto {
  src: string;
  alt?: string;
}

export interface ErosguiaParams {
  /** City name from ficha grid "Ciudad" field. */
  city?: string;
  /** Nationality display name from ficha grid "Nacionalidad" field, e.g. "Colombiana". */
  nationality?: string;
  /** Raw age string, e.g. "22 años". Parse with `parseErosguiaAge`. */
  age?: string;
  /** Raw height string, e.g. "160 cm.". Parse with `parseErosguiaHeightCm`. */
  heightCm?: string;
  /** Language display names split from comma-separated string, e.g. ["Español", "Inglés"]. */
  languages: string[];
}

export interface ErosguiaPayload {
  /** Numeric string from URL path, e.g. "55383" from "/55383.html". */
  sourceId: string;
  sourceUrl: string;
  nickname: string;
  bio?: string;
  params: ErosguiaParams;
  /** Hobby/service names from the Aficiones panel (responsive). */
  services: string[];
  /** Digits only, e.g. "614246033" — extracted from title "- NNN NNN NNN -". May differ from WA number. */
  phone?: string;
  /** E.164 phone from wa.me href — may differ from `phone`. */
  whatsappPhone?: string;
  /** Full wa.me href (kept for audit). */
  whatsappHref?: string;
  /** Full Telegram URL, e.g. "https://t.me/+34643435399". */
  telegramHref?: string;
  photos: ErosguiaPhoto[];
}
