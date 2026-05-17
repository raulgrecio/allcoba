/**
 * Loquosex — raw payload model.
 *
 * Technology: PHP SSR (custom WordPress-like CMS).
 * Profile URL pattern: /{slug}-{phone}.html  — phone = sourceId.
 *
 * Data layers:
 *   PROFILE  → title, nickname, bio, phone, whatsapp, photos
 *   ATTRS    → age, nationality, city, zone, category, priceMin, isPremium
 *   SERVICES → si/no paired columns (name + included flag)
 *   PAGE     → sourceId (9-digit phone), sourceUrl
 */

export interface LoquosexPhoto {
  src: string;
  alt?: string;
}

export interface LoquosexService {
  name: string;
  included: boolean;
}

export interface LoquosexParams {
  /** Raw age string, e.g. "25 años". Parse with `parseErosguiaAge`. */
  age?: string;
  /** Nationality display name, e.g. "Venezolana". */
  nationality?: string;
  /** City name from Localidad breadcrumb (3rd link or deepest available). */
  city?: string;
  /** District/zone (4th breadcrumb link if present). */
  zone?: string;
  /** Category link text, e.g. "Escort". */
  category?: string;
  /** Raw price string, e.g. "50 €". Parse with `parseLoquosexMinPrice`. */
  priceMin?: string;
  /** True when .cabecera-titulo contains "premium". */
  isPremium: boolean;
}

export interface LoquosexPayload {
  /** 9-digit phone extracted from URL slug, e.g. "677684329". */
  sourceId: string;
  sourceUrl: string;
  /** Full h1 text — ad title, not a personal name. */
  title: string;
  /** Best approximation of display name (text before phone/comma in title). */
  nickname: string;
  bio?: string;
  params: LoquosexParams;
  /** SI/NO paired service list. */
  services: LoquosexService[];
  /** Digits only, e.g. "677684329" — from .numero-telefono or tel: href. */
  phone?: string;
  /** E.164 phone from WhatsApp href. */
  whatsappPhone?: string;
  /** Full WA href (kept for audit). */
  whatsappHref?: string;
  photos: LoquosexPhoto[];
}
