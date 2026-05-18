import type {
  EnergyRating,
  PropertyListingType,
  PropertyType,
} from '@allcoba/shared-types';

/**
 * Idealista detail URLs follow `/inmueble/{numericId}/`.
 */
export function parseSourceIdFromUrl(url: string): string {
  const match = url.match(/\/inmueble\/(\d+)/);
  if (match && match[1]) return match[1];
  const last = url.split('/').filter(Boolean).pop();
  return last ?? url;
}

/**
 * Title prefix decides sale vs rent:
 *   "Ático en venta..."   → sale
 *   "Piso en alquiler..." → rent
 */
export function parseListingType(title?: string): PropertyListingType {
  if (!title) return 'sale';
  const v = title.toLowerCase();
  if (v.includes('en alquiler') || v.includes('alquila')) return 'rent';
  return 'sale';
}

/**
 * Title prefix decides property type:
 *   "Piso", "Ático", "Casa", "Estudio", "Dúplex", "Loft", "Oficina", "Local".
 */
export function parsePropertyType(title?: string): PropertyType | undefined {
  if (!title) return undefined;
  const v = title.toLowerCase().trim();
  if (v.startsWith('ático')) return 'penthouse';
  if (v.startsWith('piso')) return 'flat';
  if (v.startsWith('casa') || v.startsWith('chalet')) return 'house';
  if (v.startsWith('estudio')) return 'studio';
  if (v.startsWith('dúplex') || v.startsWith('duplex')) return 'duplex';
  if (v.startsWith('loft')) return 'loft';
  if (v.startsWith('oficina')) return 'office';
  if (v.startsWith('local') || v.startsWith('nave')) return 'commercial';
  if (v.startsWith('terreno') || v.startsWith('finca')) return 'land';
  return 'other';
}

/**
 * "1.400.000 €" → 1400000.
 */
export function parsePrice(raw?: string): number {
  if (!raw) return 0;
  const digits = raw.replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

/**
 * `Planta 6ª exterior` → "6ª". `Bajo` / `Sótano` / `Ático` kept literal.
 */
export function parseFloor(raw?: string): string | undefined {
  if (!raw) return undefined;
  const m = raw.match(/Planta\s+(\S+)/i);
  if (m && m[1]) return m[1];
  const v = raw.trim().toLowerCase();
  if (v.includes('bajo')) return 'Bajo';
  if (v.includes('sótano') || v.includes('sotano')) return 'Sótano';
  if (v.includes('entresuelo')) return 'Entresuelo';
  if (v.includes('ático') || v.includes('atico')) return 'Ático';
  return undefined;
}

export function parseBuildYear(raw?: string): number | undefined {
  if (!raw) return undefined;
  const m = raw.match(/Construido en\s+(\d{4})/i);
  return m && m[1] ? parseInt(m[1], 10) : undefined;
}

export function parseFirstInteger(raw: string, pattern: RegExp): number | undefined {
  const m = raw.match(pattern);
  return m && m[1] ? parseInt(m[1], 10) : undefined;
}

/**
 * Idealista renders energy ratings as `icon-energy-c-{letter}` classes
 * (e.g. `icon-energy-c-c` → C, `icon-energy-c-a` → A).
 */
export function parseEnergyRatingFromIconClass(className?: string): EnergyRating | undefined {
  if (!className) return undefined;
  const m = className.match(/icon-energy-c-([a-g])/i);
  return m && m[1] ? (m[1].toUpperCase() as EnergyRating) : undefined;
}

/**
 * Idealista title structure:
 *   "Ático en venta en Calle de Isabel la Católica" → "Calle de Isabel la Católica"
 */
export function parseStreetFromTitle(title?: string): string | undefined {
  if (!title) return undefined;
  const m = title.match(/en\s+(?:venta|alquiler)\s+en\s+(.+)$/i);
  return m && m[1] ? m[1].trim() : undefined;
}

/**
 * Subtitle structure: "Palacio, Madrid" → { neighborhood: "Palacio", city: "Madrid" }.
 * "Madrid" alone → { city: "Madrid" }.
 */
export interface IdealistaSubtitleParts {
  readonly neighborhood?: string;
  readonly city?: string;
}

export function parseSubtitle(subtitle?: string): IdealistaSubtitleParts {
  if (!subtitle) return {};
  const parts = subtitle.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { city: parts[0] };
  return { neighborhood: parts[0], city: parts[parts.length - 1] };
}
