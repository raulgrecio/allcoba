import type {
  BodyType,
  EnvironmentalLabel,
  FuelType,
  Transmission,
  VehicleCondition,
} from '@allcoba/shared-types';

/**
 * Coches.net URLs end in `-{numericId}-{slug}.aspx`. We capture the numeric id.
 * Examples:
 *   /km-0/peugeot/e-408/asturias/foo-61537261-kovn.aspx → 61537261
 *   https://www.coches.net/foo-bar-12345678-abcd.aspx   → 12345678
 */
export function parseSourceIdFromUrl(url: string): string {
  const match = url.match(/-(\d{6,})-[a-z0-9]+\.aspx/i);
  if (match && match[1]) return match[1];
  const fallback = url.match(/(\d{6,})/);
  return fallback?.[1] ?? url;
}

/**
 * Spanish fuel-type strings as published by Coches.net.
 */
export function parseFuelType(raw?: string): FuelType | undefined {
  if (!raw) return undefined;
  const v = raw.toLowerCase();
  if (v.includes('eléctr') || v.includes('electric')) return 'electric';
  if (v.includes('híbrido enchuf') || v.includes('plug')) return 'plug-in-hybrid';
  if (v.includes('híbrido') || v.includes('hybrid')) return 'hybrid';
  if (v.includes('diés') || v.includes('diesel')) return 'diesel';
  if (v.includes('gasolina') || v.includes('petrol')) return 'petrol';
  if (v === 'glp' || v.includes('lpg')) return 'lpg';
  if (v.includes('gnc') || v.includes('cng')) return 'cng';
  if (v.includes('hidrógeno') || v.includes('hydrogen')) return 'hydrogen';
  return 'other';
}

/**
 * `COMMON.TRANSMISSION_AUTOMATIC` / `COMMON.TRANSMISSION_MANUAL` translation
 * keys as published by the API.
 */
export function parseTransmission(raw?: string): Transmission | undefined {
  if (!raw) return undefined;
  const v = raw.toUpperCase();
  if (v.includes('AUTOMATIC')) return 'automatic';
  if (v.includes('MANUAL')) return 'manual';
  if (v.includes('SEMI')) return 'semi-automatic';
  return 'other';
}

/**
 * `COMMON.COLOR_WHITE` → `white`.
 */
export function parseColor(raw?: string): string | undefined {
  if (!raw) return undefined;
  const stripped = raw.replace(/^COMMON\.COLOR_/i, '').toLowerCase();
  return stripped.length > 0 ? stripped : undefined;
}

export function parseEnvironmentalLabel(raw?: string): EnvironmentalLabel | undefined {
  if (!raw) return undefined;
  const v = raw.toUpperCase();
  if (v === '0' || v === 'ECO' || v === 'C' || v === 'B' || v === 'A') {
    return v as EnvironmentalLabel;
  }
  if (v === 'UNLABELLED' || v === 'SIN ETIQUETA') return 'unlabelled';
  return undefined;
}

/**
 * Coches.net bodyTypeId → BodyType.
 * Best-effort mapping from observed numeric ids.
 */
export function parseBodyType(id?: number): BodyType | undefined {
  switch (id) {
    case 1:
      return 'sedan';
    case 2:
      return 'hatchback';
    case 3:
      return 'suv';
    case 4:
      return 'coupe';
    case 5:
      return 'convertible';
    case 6:
      return 'wagon';
    case 7:
      return 'pickup';
    case 8:
      return 'van';
    case 9:
      return 'minivan';
    default:
      return undefined;
  }
}

/**
 * Coches.net offerType.id → VehicleCondition.
 *   1 = used, 2 = km-0, 3 = new, 4 = damaged (observed best-effort).
 */
export function parseCondition(offerTypeId?: number, km?: number): VehicleCondition | undefined {
  switch (offerTypeId) {
    case 1:
      return 'used';
    case 2:
      return 'km-0';
    case 3:
      return 'new';
    case 4:
      return 'damaged';
    default:
      if (km != null && km <= 100) return 'km-0';
      if (km != null && km === 0) return 'new';
      if (km != null) return 'used';
      return undefined;
  }
}
