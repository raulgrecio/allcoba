/**
 * TopEscortBabes — Modelo completo del JSON de perfil
 * ----------------------------------------------------------------------------
 * Inferido a partir de 51 ficheros reales en external/temporal/topescortbabes/jsons.
 *
 * El payload mezcla TRES capas conceptuales:
 *   1. PROFILE      → datos propios del Presenter (id, nickname, fotos, prices, aboutMe…).
 *   2. MASTER       → catálogos compartidos (Country, City, Currency, taxonomías…).
 *   3. PAGE / SEO   → render del HTML servido (breadcrumb, meta*, faqs, pageSchema…).
 *
 * El bloque `pageSchema."@graph"` sigue **schema.org** estándar
 * (Person, Organization, Service, Offer, ProfilePage, BreadcrumbList, FAQPage),
 * por lo que las interfaces "SchemaOrg*" extienden tipos base reutilizables.
 *
 * Convención: los strings que aparecen como HTML con `<a href…>` se tipan como
 * `HtmlString` (alias de string) para señalar que requieren parseo.
 */

// ============================================================================
// 0. Aliases y tipos primitivos comunes
// ============================================================================

/** Cadena HTML con etiquetas embebidas. Requiere strip/parse. */
export type HtmlString = string;

/** Numérico serializado como string (común en este API). */
export type NumericString = string;

/** Fecha legible no-ISO ("Actualizado el 01 septiembre, 2025"). */
export type HumanDate = string;

/** "hace 4 días", "hace 25 meses". */
export type RelativeTime = string;

/** ISO-3166-1 alpha-2 ("ES", "GB"). */
export type Iso2Code = string;

/** ISO-3166-1 alpha-3 ("ESP"). */
export type Iso3Code = string;

/** Subdominio canónico ("spain", "uk"). */
export type CountrySubdomain = string;

/** Identificador interno del CMS (siempre string en el payload). */
export type EntityId = NumericString;

// ============================================================================
// 1. ENUMs y unions cerradas
// ============================================================================

export enum Category {
  Escorts = 'escorts',
  // Observados en moreLinks: 'erotic-massage' como vertical hermana pero no aparece en .category
}

export enum ContactOption {
  Calls = 'Calls',
  SMS = 'SMS',
  Whatsapp = 'Whatsapp',
  Telegram = 'Telegram',
}

export enum CurrencyCode {
  EUR = 'EUR',
  GBP = 'GBP',
  AED = 'AED',
}

export enum PriceLabel {
  H1 = '1 hora',
  H2 = '2 horas',
  H3 = '3 horas',
  H12 = '12 horas',
  H24 = '24 horas',
}

export enum PriceLabelType {
  Lower = 'lower',
}

export enum MediaType {
  Image = 'image',
  Video = 'video',
}

export enum MediaOrientation {
  Landscape = 'landscape',
  Portrait = 'portrait',
}

/**
 * verification_level de las fotos:
 *  -1 = no verificada
 *   1 = "Parecía similar"
 *   2 = "Parecía un poco diferente"
 */
export enum PhotoVerificationLevel {
  NotVerified = -1,
  Similar = 1,
  SlightlyDifferent = 2,
}

export enum FaqKey {
  HowCanBook = 'how_can_book',
  WhatLanguagesSpoken = 'what_languages_spoken',
  WhereCanMeet = 'where_can_meet',
  PhotosVerified = 'photos_verified',
}

/** Plataformas externas observadas (otherPlatforms[].name). */
export enum CrossPlatformName {
  RealEscorts = 'Real Escorts',
  ParisEscortGirls = 'Paris Escort Girls',
}

/** Sexo (Schema.org Person.gender). */
export enum SchemaGender {
  Female = 'Female',
  Male = 'Male',
  Other = 'Other',
}

/** Unidades schema.org QuantitativeValue para altura/peso. */
export enum QuantitativeUnit {
  Cm = 'cm',
  Kg = 'kg',
}

/** Schema.org Offer.availability. */
export enum SchemaAvailability {
  InStock = 'https://schema.org/InStock',
  OutOfStock = 'https://schema.org/OutOfStock',
}

// ============================================================================
// 2. SCHEMA.ORG — tipos base (subset usado por TopEscortBabes)
// ============================================================================

export interface SchemaOrgThing {
  '@type': string;
  '@id'?: string;
  '@context'?: 'https://schema.org';
  name?: string;
  url?: string;
}

export interface SchemaImageObject extends SchemaOrgThing {
  '@type': 'ImageObject';
  url: string;
  width?: number;
  height?: number;
}

export interface SchemaCountry extends SchemaOrgThing {
  '@type': 'Country';
  name: string;
}

export interface SchemaLanguage extends SchemaOrgThing {
  '@type': 'Language';
  name: string;
  /** ISO-639-1: "en", "es"... */
  alternateName?: string;
}

export interface SchemaGeoCoordinates extends SchemaOrgThing {
  '@type': 'GeoCoordinates';
  latitude: NumericString;
  longitude: NumericString;
}

export interface SchemaCity extends SchemaOrgThing {
  '@type': 'City';
  name: string;
  geo?: SchemaGeoCoordinates;
}

export interface SchemaQuantitativeValue extends SchemaOrgThing {
  '@type': 'QuantitativeValue';
  value: NumericString;
  unitText: QuantitativeUnit;
}

export interface SchemaOffer extends SchemaOrgThing {
  '@type': 'Offer';
  description: PriceLabel | string;
  price: NumericString;
  priceCurrency: CurrencyCode;
  availability: SchemaAvailability;
  /** ISO-8601 (YYYY-MM-DD). */
  priceValidUntil?: string;
  itemOffered?: { '@id': string };
}

export interface SchemaPerson extends SchemaOrgThing {
  '@type': 'Person';
  name: string;
  jobTitle: string;
  gender: SchemaGender;
  image: SchemaImageObject;
  worksFor?: { '@id': string };
  workLocation?: SchemaCity;
  description?: HtmlString;
  nationality?: SchemaCountry;
  height?: SchemaQuantitativeValue;
  weight?: SchemaQuantitativeValue;
  knowsLanguage?: SchemaLanguage[];
  makesOffer?: SchemaOffer | SchemaOffer[];
}

export interface SchemaOrganization extends SchemaOrgThing {
  '@type': 'Organization';
  name: string;
  url: string;
  image: SchemaImageObject;
}

export interface SchemaService extends SchemaOrgThing {
  '@type': 'Service';
  name: string;
  serviceType: string;
  provider: { '@id': string };
  url: string;
  image: SchemaImageObject;
  areaServed: SchemaCity;
  offers: SchemaOffer[];
}

export interface SchemaProfilePage extends SchemaOrgThing {
  '@type': 'ProfilePage';
  url: string;
  mainEntity: { '@id': string };
}

export interface SchemaBreadcrumbItem {
  '@id': string;
  name: string;
}

export interface SchemaListItem extends SchemaOrgThing {
  '@type': 'ListItem';
  position: number;
  item: SchemaBreadcrumbItem;
}

export interface SchemaBreadcrumbList extends SchemaOrgThing {
  '@type': 'BreadcrumbList';
  itemListElement: SchemaListItem[];
}

export interface SchemaAnswer extends SchemaOrgThing {
  '@type': 'Answer';
  text: HtmlString;
}

export interface SchemaQuestion extends SchemaOrgThing {
  '@type': 'Question';
  name: string;
  acceptedAnswer: SchemaAnswer;
}

export interface SchemaFAQPage extends SchemaOrgThing {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: SchemaQuestion[];
}

export type SchemaGraphNode =
  | SchemaPerson
  | SchemaOrganization
  | SchemaService
  | SchemaProfilePage
  | SchemaBreadcrumbList
  | SchemaFAQPage;

export interface PageSchema {
  '@context': 'https://schema.org';
  '@graph': SchemaGraphNode[];
}

// ============================================================================
// 3. MASTER DATA — catálogos compartidos
// ============================================================================

/**
 * Catálogo de país (fila completa de tabla master).
 * Aparece como `country` y `ipCountry` (geo del visitante).
 */
export interface CountryRecord {
  id: EntityId;
  name: string;
  seo_name?: string;
  iso2: Iso2Code;
  code: Iso3Code;
  new_seo: NumericString;
  shortname: string;
  subdomain: CountrySubdomain;
  currency_code: CurrencyCode;
  currency_name: string;
  currency_symbol: string;
  currency_nl: CurrencyCode;
  vxs_id: NumericString;
  conversion_rate: NumericString;
  nationality_id: NumericString;
  default_language: string;
  region: string;
  sub_region: string;
  intermediate_region: string;
  /** JSON-string de array de ISO2: '["AD","FR",…]'. */
  neighboring_countries: string;
  updated_at: string;
  created_at: string;
  reg_blacklist: NumericString;
}

/** Versión reducida embebida en City.country. */
export interface CountryRef {
  id: EntityId;
  iso2: Iso2Code;
  name: string;
  /** Presente como `subdomain` o `url_segment` según el contexto. */
  subdomain?: CountrySubdomain;
  url_segment?: CountrySubdomain;
}

/**
 * Identidad mínima de una ciudad en el catálogo.
 * Todas las variantes (CityRecord, TopCityLink, NearbyCityLink) extienden esto.
 */
export interface CityIdentity {
  id: EntityId;
  name: string;
}

/**
 * Ciudad como entrada de catálogo SEO (slug + país + contadores).
 * Base común de los bloques de navegación (topCitiesForSearch, internalLinks).
 *
 * Nota: el slug se llama `city_escaped` en estos bloques y `url_segment` en
 * los CityRecord embebidos en el perfil — son el mismo valor.
 */
export interface CityCatalogLink extends CityIdentity {
  country_id: EntityId;
  /** Slug URL-safe ("las-rozas-de-madrid"). Equivale a CityRecord.url_segment. */
  city_escaped: string;
  /** Nº de perfiles activos en esa ciudad. */
  user_count: NumericString;
}

/** Ciudad del bloque "top cities" del país. */
export type TopCityLink = CityCatalogLink;

/**
 * Ciudad en navegación lateral con distancia al perfil.
 * Mantiene `url_segment` además de `city_escaped` (mismo valor, duplicado por la API).
 */
export interface NearbyCityLink extends CityCatalogLink {
  url_segment: string;
  /** Km desde la ciudad del perfil. */
  distance: NumericString;
}

/**
 * Catálogo de ciudad con geolocalización, embebido en el perfil
 * (baseCity, currentCity, city de la página, workLocation de Schema.org).
 *
 * No incluye `country_id` plano — el país viene anidado en `country: CountryRef`
 * (que sí contiene .id). Tampoco trae `user_count`.
 */
export interface CityRecord extends CityIdentity {
  /** Mismo slug que CityCatalogLink.city_escaped. */
  url_segment: string;
  country: CountryRef;
  lat: NumericString;
  lng: NumericString;
}

// ============================================================================
// 4. PROFILE DATA — datos propios del Presenter
// ============================================================================

export interface AboutMe {
  /** Versión traducida (HTML con <br />). */
  content: HtmlString;
  /** Texto original escrito por el Presenter. */
  original: HtmlString;
  /** ISO-639-1 del original; vacío si coincide con la UI. */
  original_language: string;
}

export interface Price {
  label: PriceLabel | string;
  price: NumericString;
  currency: CurrencyCode;
}

export interface MeetingPlaces {
  /** "en mi piso" (Incall). */
  incall: boolean;
  /** "a domicilio / hotel" (Outcall). */
  outcall: boolean;
}

export interface Badges {
  verified: boolean;
  trans: boolean;
  vip: boolean;
  pornstar: boolean;
}

/**
 * Bloque "datos personales" — todo viene como HtmlString porque cada valor
 * lleva embebido un `<a href>` hacia su faceta de búsqueda (taxonomía).
 *
 * El TEXTO del enlace es el valor real (ej. "venezolana", "165cm / 5'5\"").
 * El HREF apunta al catálogo de SEO (`*-nationality`, `*-hair`, `*-eyes`…).
 */
export interface PersonalDetails {
  /** "España, Madrid" con dos <a>. */
  location: HtmlString;
  /** ej. "venezolana". */
  nationality: HtmlString;
  /** Etnia/raza. ej. "latina", "blanca", "asiática". */
  ethnic: HtmlString;
  /** "encuentro con un hombre", "mujer", "pareja", combinaciones. */
  meetingWith: string;
  /** Mismo dato que MeetingPlaces, pero como HTML con etiquetas. */
  meetingPlace: HtmlString;
  /** ej. "35" envuelto en <a href="…/milf-age">. */
  age: HtmlString;
  /** "165cm / 5'5\"". */
  height: HtmlString;
  /** "54kg / 119lbs". */
  weight: HtmlString;
  /** Medidas en cm (string numérico). */
  bust?: NumericString;
  hip?: NumericString;
  waist?: NumericString;
  /** ej. "pelo castaño". */
  hair: HtmlString;
  /** ej. "ojos marrones". */
  eyes: HtmlString;
  /** "Bisexual" | "Heterosexual" | "Lesbiana". */
  orientation: HtmlString;
  /** "habla inglés y español" (también disponible en .spokenLanguage). */
  languages: string;
  /** Atributos libres opcionales. */
  drink?: string;
  music?: string;
  hobby?: string;
}

/** Foto del perfil. */
export interface Photo {
  thumbnail: string;
  /** srcset HTML para <img>. */
  srcset: string;
  /** URL de máxima resolución. */
  path: string;
  path_srcset: string;
  width: number;
  height: number;
  verification_level: PhotoVerificationLevel;
  verification_text: HtmlString;
  verification_at: RelativeTime;
  uploaded_on: RelativeTime;
}

/** Vídeo o imagen principal del perfil. */
export interface MainMedia {
  type: MediaType;
  path: string;
  /** Frame de poster (solo video). */
  poster?: string;
  /** Imagen fallback si falla el video. */
  fallback?: string;
  orientation: MediaOrientation;
  /** Numérico-string en el payload. */
  width: NumericString;
  height: NumericString;
  small_image: string;
}

/** Tour publicado: ciudad + fechas. Array vacío en todos los ejemplos. */
export interface Tour {
  city?: CityRecord;
  /** Fecha inicio (ISO o "DD/MM/YYYY"). */
  date_from?: string;
  date_to?: string;
  [key: string]: unknown;
}

/**
 * Sub-ratings desglosados de las reviews.
 * Aparece como NumericString ("10.0") en reviewsOverall.average_ratings
 * y como number/NumericString en ratingDistributions.
 */
export interface ReviewSubratingsString {
  place: NumericString | null;
  punctuality: NumericString | null;
  looks: NumericString | null;
  attitude: NumericString | null;
  services: NumericString | null;
  photos_accuracy: NumericString | null;
}

/** Sub-rating individual de una review concreta. */
export interface ReviewSubratings {
  place: NumericString;
  punctuality: NumericString;
  looks: NumericString;
  attitude: NumericString;
  services: NumericString;
  photos_accuracy: NumericString;
}

export interface ReviewTag {
  text: string;
  count: number;
  positive: boolean;
}

export interface ReviewsOverall {
  count: number;
  tags: ReviewTag[];
  average_ratings: ReviewSubratingsString | null;
  /** 0–100. */
  meet_again_percentage: number | null;
  new_reviews_count: number;
  has_old_review: boolean;
}

/** Distribución 1–10 con conteo y porcentaje. */
export interface RatingDistribution {
  distribution: Record<'1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10', number>;
  percentage_distribution: Record<
    '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10',
    number
  >;
  total_ratings: number;
  average_rating: number;
}

/** Distribución para cada sub-criterio (null si no hay datos). */
export interface RatingDistributions {
  overall: RatingDistribution | null;
  place: RatingDistribution | null;
  punctuality: RatingDistribution | null;
  looks: RatingDistribution | null;
  attitude: RatingDistribution | null;
  services: RatingDistribution | null;
  photos_accuracy: RatingDistribution | null;
}

export interface Review {
  id: EntityId;
  /** Texto traducido a la UI. null si está vacío. */
  review: string | null;
  review_original: string;
  review_language: string;
  review_language_text: string | null;
  nickname: string;
  meet_city: string;
  iso2: Iso2Code | null;
  ratings: ReviewSubratings;
  review_date: RelativeTime;
  average_rating: number;
  meeting_place: string;
  meet_again: string;
  meet_good: boolean;
  liked: boolean;
  liked_count: number;
  contact_text: string;
  appearance_text: string;
  attitude_text: string;
  experience_text: string;
  satisfaction_text: string;
}

export interface ProfileStatistics {
  id: number;
  /** Nº de fotos. */
  pic: number;
  /** Nº de vídeos. */
  vid: number;
  /** Flag VIP (0/1). */
  vip: 0 | 1;
  /** Flag verificada (0/1). */
  ver: 0 | 1;
  /** Tours activos. */
  tour: number;
  /** Country id. */
  co: number;
  /** City id. */
  ci: number;
  /** Agency id (0 = independiente). */
  ab: number;
}

/** Perfil duplicado en otra web del mismo grupo. */
export interface CrossPlatformLink {
  name: CrossPlatformName | string;
  url: string;
}

export interface ProfileLinks {
  /** Web personal declarada por el Presenter. */
  website: string | null;
}

// ============================================================================
// 5. PAGE / SEO — datos para renderizar la página, no del Presenter
// ============================================================================

export interface BreadcrumbElement {
  text: string;
  schemaText: string;
  title: string;
  url: string;
  analyticsName: string;
  tag: string;
}

export interface Breadcrumb {
  schema: unknown[];
  elements: BreadcrumbElement[];
}

export interface Faq {
  title: string;
  content: HtmlString;
  key: FaqKey;
}

export interface MoreLink {
  link: string;
  text: string;
}

// ============================================================================
// 6. ROOT — payload completo de TopEscortBabes
// ============================================================================

/**
 * Sub-bloque PROFILE: si en algún momento se quiere persistir solo el perfil
 * desacoplado de página y catálogos, usar este subset.
 */
export interface TopEscortBabesProfile {
  id: number;
  agencyId: number;
  nickname: string;
  active: boolean;
  /** Edad como string (siempre numérica). */
  age: NumericString;
  category: Category;
  badges: Badges;
  humanVerified: boolean;
  baseCity: CityRecord;
  currentCity: CityRecord;
  meetingPlaces: MeetingPlaces;
  contactOptions: ContactOption[];
  spokenLanguage: string;
  /** ej. "Desde 220 €". */
  minimumPrice: string;
  priceLabelType: PriceLabelType | null;
  prices: Price[];
  /** ej. "Ofrezco servicios <b>en mi piso</b> y <b>a domicilio o en hotel</b>." */
  serviceText: HtmlString;
  tours: Tour[];
  topTourText: string | null;
  aboutMe: AboutMe;
  personalDetails: PersonalDetails;
  photos: Photo[];
  photosCount: number;
  mainMedia: MainMedia;
  links: ProfileLinks;
  otherPlatforms: CrossPlatformLink[];
  encodedPhoneNumber: string;
  encodedTelegram: string;
  phoneNumber: string | null;
  reviewEnabled: boolean;
  reviewsCount: number;
  reviewsRating: number;
  reviewsOverall: ReviewsOverall;
  ratingDistributions: RatingDistributions | null;
  reviews: Review[];
  lastActive: RelativeTime;
  updatedAt: HumanDate;
  statisticsData: ProfileStatistics;
}

/**
 * Payload raíz tal y como lo entrega el endpoint /profile.
 * Combina PROFILE + PAGE + MASTER en un único objeto.
 */
export interface TopEscortBabesPayload extends TopEscortBabesProfile {
  // ---- Master / catálogos ----
  /** País del visitante (geo IP). */
  ipCountry: CountryRecord;
  /** País del perfil (página). */
  country: CountryRecord;
  /** Ciudad del perfil (página). */
  city: CityRecord;
  internalLinks: NearbyCityLink[];
  topCitiesForSearch: TopCityLink[];

  // ---- Página / SEO ----
  canonical: string;
  metaTitle: string;
  metaDescription: string;
  metaImage: string;
  logoTitle: string;
  aiTitle: string;
  galleryImgAlt: string;
  locationName: string;
  locationUrl: string;
  breadcrumb: Breadcrumb;
  faqs: Faq[];
  moreLinks: MoreLink[];
  preloadImages: string[];
  pageSchema: PageSchema;

  // ---- Navegación de fichas ----
  previousProfileId: number;
  nextProfileId: number;

  // ---- Estado de la página / usuario actual ----
  isOwner: boolean;
  saved: boolean;
  isAboundedProfile: boolean;
  hideAgenciesLink: boolean;
  is404Mode: boolean;
  is404ProfileMode: boolean;
  trackHash: string;
  nextReportRemaining: number;
  nextReviewRemaining: number;

  // ---- Página de reviews ----
  reviewPageLink: string;
  reviewPageHeaderTitle: string;
  reviewPageFooterText: string;
}

// ============================================================================
// 7. Helpers de discriminación de tipos
// ============================================================================

export const isSchemaPerson = (n: SchemaGraphNode): n is SchemaPerson =>
  n['@type'] === 'Person';
export const isSchemaOrganization = (n: SchemaGraphNode): n is SchemaOrganization =>
  n['@type'] === 'Organization';
export const isSchemaService = (n: SchemaGraphNode): n is SchemaService =>
  n['@type'] === 'Service';
export const isSchemaProfilePage = (n: SchemaGraphNode): n is SchemaProfilePage =>
  n['@type'] === 'ProfilePage';
export const isSchemaBreadcrumbList = (n: SchemaGraphNode): n is SchemaBreadcrumbList =>
  n['@type'] === 'BreadcrumbList';
export const isSchemaFAQPage = (n: SchemaGraphNode): n is SchemaFAQPage =>
  n['@type'] === 'FAQPage';
