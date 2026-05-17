/**
 * GirlsBCN / GirlsMadrid — shared raw payload model.
 *
 * Both sites run the same PHP backend (gbcnmedia.net CDN) but use different
 * HTML templates. The extractor for each site produces this same typed payload.
 * The mapper is shared and takes a `source` discriminant.
 *
 * Data layers:
 *   PROFILE  → nickname, bio, phone, whatsapp, photos, video
 *   ATTRS    → age, measurements, height, weight, hair, eyes, nationality,
 *              languages, schedule, city, priceRange
 *   PAGE     → sourceId, sourceUrl (from URL parameter, not embedded in HTML)
 */

export interface GirlsBcnPhoto {
  src: string;
  alt?: string;
}

export interface GirlsBcnVideo {
  src: string;
  poster?: string;
}

export interface GirlsBcnParams {
  /** Raw string, e.g. "25 años". Parse with `parseInt`. */
  age?: string;
  /** "bust - waist - hip" in cm, e.g. "80 - 60 - 95". */
  measurements?: string;
  /** Raw string, e.g. "160 cm.". Parse with `parseGBCNHeight`. */
  heightCm?: string;
  /** Raw string, e.g. "55 Kg.". Parse with `parseGBCNWeight`. */
  weightKg?: string;
  hairColor?: string;
  eyeColor?: string;
  nationality?: string;
  /** Language display names extracted from `img[title]` in Idiomas field. */
  languages: string[];
  schedule?: string;
  /** City name from "disponible en: {city}" text (GirlsBCN) or hardcoded (GirlsMadrid). */
  city?: string;
  /** Meeting place tags from GirlsMadrid widget (e.g. ["En tu casa", "Hoteles"]). */
  meetingPlaces?: string[];
  /** 1-5 scale from `perfil-N.png` filename. */
  priceRange?: number;
}

export interface GirlsBcnPayload {
  /** Slug from URL path, e.g. "gbcamila105" or "escort-lucia167". */
  sourceId: string;
  sourceUrl: string;
  nickname: string;
  bio?: string;
  params: GirlsBcnParams;
  /** Normalized digits only, e.g. "663475960". */
  phone?: string;
  /** E.164 phone derived from WhatsApp href. */
  whatsappPhone?: string;
  /** Full wa.me href (kept for audit). */
  whatsappHref?: string;
  photos: GirlsBcnPhoto[];
  video?: GirlsBcnVideo;
}
