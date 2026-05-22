import type { FotocasaFeatureEntry } from './fotocasa.parsers.js';
import type { FotocasaPayload, FotocasaPhoto } from './fotocasa.types.js';
import {
  cleanLocality,
  parseEnergyRating,
  parseExtraFeatures,
  parseFloor,
  parseListingType,
  parsePriceMode,
  parsePropertyType,
  parseSourceIdFromUrl,
  readBooleanFeature,
  readLetterFeature,
  readStringFeature,
} from './fotocasa.parsers.js';

interface FotocasaAdEntity {
  id?: string;
  propertyId?: number;
  propertyTypeId?: number;
  transactionTypeId?: number;
  buildingType?: string;
  description?: string;
  address?: {
    locality?: string;
    municipality?: string;
    neighborhood?: string;
    zipCode?: string;
    coordinates?: { lat?: number; lng?: number };
    street?: { name?: string };
  };
  price?: { amount?: number; periodicity?: number };
  features?:
    | ReadonlyArray<FotocasaFeatureEntry>
    | { rooms?: number; bathrooms?: number; surface?: number };
  multimedias?: Array<{ position?: number; type?: string; url?: string }>;
  extraFeatures?: string[];
  publisher?: { alias?: string; name?: string };
  energyCertificate?: {
    energyEfficiencyRatingType?: string;
    environmentImpactRatingType?: string;
  };
}

interface FotocasaRealEstateExtras {
  features?: {
    rooms?: number;
    bathrooms?: number;
    surface?: number;
    floor?: number;
  };
}

interface FotocasaInitialProps {
  propertyTitle?: string;
  realEstateAdDetailEntityV2?: FotocasaAdEntity;
  realEstate?: FotocasaRealEstateExtras;
}

/**
 * Parse the JS string literal extracted from `JSON.parse('...')` safely.
 * Uses `new Function` with a single `return <literal>` expression — no
 * other tokens are executed.
 */
function decodeJsStringLiteral(literal: string): string {
  return Function(`"use strict"; return ${literal};`)() as string;
}

/**
 * Scan a single-quoted JS string literal starting at `start` (the opening
 * quote position). Returns the end index (the closing quote position) or -1.
 * Respects `\\` escape sequences so escaped quotes inside the string do not
 * terminate it.
 */
function scanJsStringLiteral(text: string, start: number): number {
  let i = start + 1;
  while (i < text.length) {
    const c = text[i];
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (c === "'") return i;
    i++;
  }
  return -1;
}

function extractInitialProps(html: string): FotocasaInitialProps | null {
  // The ad payload lives in `window.__INITIAL_PROPS__` (not __INITIAL_DATA__,
  // which only carries browser/i18n metadata).
  const marker = 'window.__INITIAL_PROPS__ = JSON.parse(';
  const markerIdx = html.indexOf(marker);
  if (markerIdx === -1) return null;

  let quoteIdx = markerIdx + marker.length;
  while (quoteIdx < html.length && html[quoteIdx] !== "'") quoteIdx++;
  if (quoteIdx >= html.length) return null;

  const endIdx = scanJsStringLiteral(html, quoteIdx);
  if (endIdx === -1) return null;

  const literal = html.slice(quoteIdx, endIdx + 1);
  try {
    const jsonString = decodeJsStringLiteral(literal);
    return JSON.parse(jsonString) as FotocasaInitialProps;
  } catch {
    return null;
  }
}

export function extractFotocasa(html: string, sourceUrl: string): FotocasaPayload {
  const sourceId = parseSourceIdFromUrl(sourceUrl);
  const initial = extractInitialProps(html);
  const ad = initial?.realEstateAdDetailEntityV2;

  const title = initial?.propertyTitle?.trim() || '';
  const description = ad?.description?.trim();

  const listingType = parseListingType(ad?.transactionTypeId);
  const priceAmount = ad?.price?.amount ?? 0;
  const priceMode = parsePriceMode(ad?.price?.periodicity, listingType);

  // `ad.features` is the typed-entry array (TYPOLOGY / FLOOR / ELEVATOR …).
  // Numeric rooms/bathrooms/surface live in a parallel root key `realEstate.features`.
  const featuresArr: ReadonlyArray<FotocasaFeatureEntry> = Array.isArray(ad?.features)
    ? (ad?.features ?? [])
    : [];
  const numericFeatures = initial?.realEstate?.features;

  const typology = readStringFeature(featuresArr, 'TYPOLOGY');
  const propertyType = parsePropertyType(ad?.propertyTypeId, typology);
  const floor = parseFloor(readStringFeature(featuresArr, 'FLOOR'));

  const energyConsumptionRating =
    parseEnergyRating(readLetterFeature(featuresArr, 'ENERGY')) ??
    parseEnergyRating(ad?.energyCertificate?.energyEfficiencyRatingType);
  const energyEmissionsRating =
    parseEnergyRating(readLetterFeature(featuresArr, 'EMISSIONS')) ??
    parseEnergyRating(ad?.energyCertificate?.environmentImpactRatingType);

  const extras = ad?.extraFeatures ?? [];
  const extraParsed = parseExtraFeatures(extras);

  const hasElevator = readBooleanFeature(featuresArr, 'ELEVATOR') ?? extraParsed.hasElevator;
  const hasFurnished = readBooleanFeature(featuresArr, 'FURNISHED') ?? extraParsed.hasFurnished;
  const hasParking = readBooleanFeature(featuresArr, 'PARKING') ?? extraParsed.hasParking;
  const hasAirConditioning =
    readBooleanFeature(featuresArr, 'AIR_CONDITIONING') ?? extraParsed.hasAirConditioning;
  const hasHeating = readBooleanFeature(featuresArr, 'HEATING') ?? extraParsed.hasHeating;
  const hasTerrace = readBooleanFeature(featuresArr, 'TERRACE') ?? extraParsed.hasTerrace;
  const hasGarden = readBooleanFeature(featuresArr, 'GARDEN') ?? extraParsed.hasGarden;
  const hasPool = readBooleanFeature(featuresArr, 'POOL') ?? extraParsed.hasPool;
  const hasStorageRoom =
    readBooleanFeature(featuresArr, 'STORAGE_ROOM') ?? extraParsed.hasStorageRoom;

  const photos: FotocasaPhoto[] = (ad?.multimedias ?? [])
    .filter((m) => m.type === 'image' && typeof m.url === 'string')
    .map((m, i) => ({ position: m.position ?? i + 1, url: m.url as string }));

  const coords = ad?.address?.coordinates;
  const coordinates =
    coords && typeof coords.lat === 'number' && typeof coords.lng === 'number'
      ? { lat: coords.lat, lng: coords.lng }
      : undefined;

  return {
    sourceId,
    sourceUrl,
    title,
    description,
    listingType,
    propertyType,
    priceAmount,
    priceMode,
    city: cleanLocality(ad?.address?.locality) ?? cleanLocality(ad?.address?.municipality),
    neighborhood: cleanLocality(ad?.address?.neighborhood),
    street: cleanLocality(ad?.address?.street?.name),
    postalCode: ad?.address?.zipCode,
    coordinates,
    surfaceM2: numericFeatures?.surface,
    roomsCount: numericFeatures?.rooms,
    bathroomsCount: numericFeatures?.bathrooms,
    floor,
    hasElevator,
    hasAirConditioning,
    hasHeating,
    hasParking,
    hasFurnished,
    hasTerrace,
    hasGarden,
    hasPool,
    hasStorageRoom,
    energyConsumptionRating,
    energyEmissionsRating,
    photos,
    agencyName: ad?.publisher?.alias ?? ad?.publisher?.name,
  };
}
