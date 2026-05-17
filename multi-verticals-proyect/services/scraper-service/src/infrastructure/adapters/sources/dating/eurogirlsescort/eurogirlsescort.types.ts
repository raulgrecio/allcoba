/**
 * EuroGirlsEscort — raw payload model extracted from HTML.
 *
 * Unlike TopEscortBabes (which embeds JSON in `window.profileData`), this
 * site is pure SSR HTML. The extractor parses Cheerio selectors into this
 * typed intermediate, which the mapper then converts to `ScrapedProvider`.
 *
 * Layer decomposition:
 *   PROFILE  → sourceId, nickname, bio, verified, badges, params, phones, photos
 *   CATALOG  → params.locationCitySlug, params.locationCountrySlug (from hrefs)
 *   PAGE/UI  → working-time, mapData, rates table, services table, reviews
 */

// ============================================================================
// Profile params block (.params div key-value pairs)
// ============================================================================

export interface EuroGirlsEscortParams {
  gender?: string;
  age?: string;
  locationCityName?: string;
  /** Slug extracted from the city href, e.g. "kuala-lumpur". */
  locationCitySlug?: string;
  locationCountryName?: string;
  /** Slug extracted from the country href, e.g. "malaysia". */
  locationCountrySlug?: string;
  cityPart?: string;
  cityPartSlug?: string;
  eyes?: string;
  hairColor?: string;
  hairLength?: string;
  pubicHair?: string;
  bustSize?: string;
  bustType?: string;
  travel?: string;
  /** Raw string, e.g. "55 kg / 121 lbs". Parse with `parseEGEWeightKg`. */
  weight?: string;
  /** Raw string, e.g. "162 cm / 5'4''". Parse with `parseEGEHeightCm`. */
  height?: string;
  ethnicity?: string;
  orientation?: string;
  smoker?: string;
  tattoo?: string;
  piercing?: string;
  nationality?: string;
  languages?: string[];
  servicesText?: string;
  /** Raw string, e.g. "Outcall + Incall". Parse with `parseEGEAvailableFor`. */
  availableFor?: string;
  /** Raw string, e.g. "Man". Parse with `parseEGEMeetingWith`. */
  meetingWith?: string;
}

// ============================================================================
// Contact / phone
// ============================================================================

export interface EuroGirlsEscortPhone {
  href: string;
  /** E.164-like string extracted from tel: href, e.g. "+60173850646". */
  number: string;
  dataId?: string;
  /** Obfuscated phone from data-phone attr — cipher not reversed. */
  dataPhone?: string;
  hasWhatsapp: boolean;
  /** ISO 3166-1 alpha-2 lowercase from `flag-icon-XX` class, e.g. "my". */
  flagCountryCode?: string;
}

// ============================================================================
// Media
// ============================================================================

export interface EuroGirlsEscortPhoto {
  /** Full-size image URL (from `<a href>` in `#js-gallery`). */
  href: string;
  title: string;
}

// ============================================================================
// Badges
// ============================================================================

export interface EuroGirlsEscortBadge {
  /** CSS class suffix: "independent", "video", "vip", "pornstar", etc. */
  type: string;
  label: string;
}

// ============================================================================
// Rates table
// ============================================================================

export interface EuroGirlsEscortRate {
  /** Raw duration label from `th`, e.g. "0.5 Hour", "1 Hour", "24 Hours". */
  duration: string;
  incallAmount?: number;
  incallCurrency?: string;
  /** EUR equivalent shown in `<small>` (omitted when primary currency is EUR). */
  incallEurAmount?: number;
  outcallAmount?: number;
  outcallCurrency?: string;
  outcallEurAmount?: number;
}

// ============================================================================
// Services table
// ============================================================================

export interface EuroGirlsEscortService {
  name: string;
  /** Optional note from `.service-note`, e.g. "during the meeting". */
  note?: string;
  included: boolean;
  extra: boolean;
}

// ============================================================================
// Reviews
// ============================================================================

export interface EuroGirlsEscortReview {
  author: string;
  /** Raw date string from the DOM, e.g. "28.4.2026". */
  date: string;
  /** Count of `i.full` stars — 0-5. */
  rating: number;
  text: string;
  city?: string;
  appointmentDate?: string;
  duration?: string;
}

// ============================================================================
// Auxiliary structures
// ============================================================================

export interface EuroGirlsEscortMapData {
  lat: number;
  lng: number;
  zoom: number;
}

export interface EuroGirlsEscortWorkingTime {
  nonstop: boolean;
  /** Free text when schedule is not 24/7. */
  scheduleText?: string;
}

// ============================================================================
// Root payload
// ============================================================================

export interface EuroGirlsEscortPayload {
  /** Numeric ID extracted from the canonical URL path, e.g. "1053224". */
  sourceId: string;
  /** Canonical URL from `<link rel="canonical">`. */
  sourceUrl: string;
  /** Display name — stripped of appended label like ", independent". */
  nickname: string;
  bio?: string;
  /** Raw date string from `#js-last-login`, e.g. "28.4.2026". */
  lastLoginDate?: string;
  verified: boolean;
  badges: EuroGirlsEscortBadge[];
  params: EuroGirlsEscortParams;
  phones: EuroGirlsEscortPhone[];
  photos: EuroGirlsEscortPhoto[];
  mapData?: EuroGirlsEscortMapData;
  workingTime: EuroGirlsEscortWorkingTime;
  rates: EuroGirlsEscortRate[];
  services: EuroGirlsEscortService[];
  reviews: EuroGirlsEscortReview[];
}
