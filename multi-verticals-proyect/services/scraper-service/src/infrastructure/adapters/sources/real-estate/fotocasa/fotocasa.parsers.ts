import type { EnergyRating, PropertyListingType, PropertyType } from '@allcoba/shared-types';

/**
 * Extract numeric propertyId from URL.
 * Pattern: `https://www.fotocasa.es/.../{numericId}/d`
 */
export function parseSourceIdFromUrl(url: string): string {
  const match = url.match(/\/(\d{6,})(?:\/|#|\?|$)/);
  if (match && match[1]) return match[1];
  const last = url.split('/').filter(Boolean).pop();
  return last ?? url;
}

/**
 * transactionTypeId mapping in Fotocasa: 1 = sale, 3 = rent.
 */
export function parseListingType(transactionTypeId?: number): PropertyListingType {
  return transactionTypeId === 3 ? 'rent' : 'sale';
}

/**
 * periodicityId mapping: 0 = total (sale), >0 = periodic (rent monthly).
 */
export function parsePriceMode(
  periodicityId?: number,
  listingType?: PropertyListingType,
): 'total' | 'per-month' | undefined {
  if (listingType === 'rent') return 'per-month';
  if (periodicityId != null && periodicityId > 0) return 'per-month';
  return 'total';
}

/**
 * propertyTypeId → PropertyType.
 * Fotocasa uses numeric ids: 2 = flat, 3 = house, 5 = penthouse, etc.
 * Also fallbacks to building/feature TYPOLOGY string.
 */
export function parsePropertyType(
  propertyTypeId?: number,
  typology?: string,
): PropertyType | undefined {
  if (typology) {
    const t = typology.toUpperCase();
    if (t === 'FLAT') return 'flat';
    if (t === 'HOUSE') return 'house';
    if (t === 'STUDIO') return 'studio';
    if (t === 'DUPLEX') return 'duplex';
    if (t === 'PENTHOUSE') return 'penthouse';
    if (t === 'LOFT') return 'loft';
    if (t === 'OFFICE') return 'office';
    if (t === 'COMMERCIAL') return 'commercial';
    if (t === 'LAND') return 'land';
  }
  switch (propertyTypeId) {
    case 2:
      return 'flat';
    case 3:
      return 'house';
    case 5:
      return 'penthouse';
    case 6:
      return 'duplex';
    case 7:
      return 'studio';
    case 8:
      return 'loft';
    default:
      return undefined;
  }
}

/**
 * Fotocasa FLOOR enum: "1ST_FLOOR" → "1ª", "GROUND_FLOOR" → "Bajo", etc.
 */
export function parseFloor(raw?: string): string | undefined {
  if (!raw) return undefined;
  const v = raw.toUpperCase();
  if (v === 'GROUND_FLOOR' || v === 'GROUND') return 'Bajo';
  if (v === 'BASEMENT') return 'Sótano';
  if (v === 'SEMIBASEMENT') return 'Semi-sótano';
  if (v === 'MEZZANINE') return 'Entresuelo';
  if (v === 'PENTHOUSE' || v === 'ATTIC') return 'Ático';
  const m = v.match(/^(\d+)(?:ST|ND|RD|TH)?_FLOOR$/);
  if (m && m[1]) return `${m[1]}ª`;
  return raw;
}

export function parseEnergyRating(raw?: string): EnergyRating | undefined {
  if (!raw) return undefined;
  const v = raw.toUpperCase();
  if (['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(v)) return v as EnergyRating;
  return undefined;
}

/**
 * Normalize extraFeatures (Spanish strings) to PropertyFeatures booleans.
 */
export interface ParsedExtraFeatures {
  hasElevator?: boolean;
  hasAirConditioning?: boolean;
  hasHeating?: boolean;
  hasParking?: boolean;
  hasFurnished?: boolean;
  hasTerrace?: boolean;
  hasGarden?: boolean;
  hasPool?: boolean;
  hasStorageRoom?: boolean;
}

export function parseExtraFeatures(extras: readonly string[]): ParsedExtraFeatures {
  const out: ParsedExtraFeatures = {};
  for (const raw of extras) {
    const v = raw.toLowerCase();
    if (v.includes('ascensor')) out.hasElevator = true;
    else if (v.includes('aire acond')) out.hasAirConditioning = true;
    else if (v.includes('calefacc')) out.hasHeating = true;
    else if (v.includes('parking') || v.includes('garaje') || v.includes('plaza de')) {
      out.hasParking = true;
    } else if (v.includes('amueblado')) out.hasFurnished = true;
    else if (v.includes('terraza')) out.hasTerrace = true;
    else if (v.includes('jardín') || v.includes('jardin')) out.hasGarden = true;
    else if (v.includes('piscina')) out.hasPool = true;
    else if (v.includes('trastero')) out.hasStorageRoom = true;
  }
  return out;
}

/**
 * Read a single Fotocasa feature entry. Some entries carry value as string
 * ("YES"/"NO"), others as object ({ letter: "G", value: 999 }).
 */
export interface FotocasaFeatureEntry {
  readonly type: string;
  readonly value: unknown;
}

export function readBooleanFeature(
  features: readonly FotocasaFeatureEntry[],
  type: string,
): boolean | undefined {
  const found = features.find((f) => f.type === type);
  if (!found) return undefined;
  const v = typeof found.value === 'string' ? found.value.toUpperCase() : found.value;
  if (v === 'YES') return true;
  if (v === 'NO') return false;
  return undefined;
}

export function readStringFeature(
  features: readonly FotocasaFeatureEntry[],
  type: string,
): string | undefined {
  const found = features.find((f) => f.type === type);
  if (!found || typeof found.value !== 'string') return undefined;
  return found.value;
}

export function readLetterFeature(
  features: readonly FotocasaFeatureEntry[],
  type: string,
): string | undefined {
  const found = features.find((f) => f.type === type);
  if (!found || typeof found.value !== 'object' || found.value == null) return undefined;
  const obj = found.value as { letter?: unknown };
  return typeof obj.letter === 'string' ? obj.letter : undefined;
}

/**
 * Normalize Fotocasa locality (often arrives with leading space).
 */
export function cleanLocality(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
