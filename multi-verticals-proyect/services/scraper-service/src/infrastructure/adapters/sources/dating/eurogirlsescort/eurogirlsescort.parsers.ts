/**
 * Pure parsers for EuroGirlsEscort raw payload fields.
 * No I/O, no DB — safe to unit-test in isolation.
 */

import type { PriceSlot } from '@allcoba/shared-types';

// ============================================================================
// Date parsing
// ============================================================================

/**
 * Parse "28.4.2026" or "28.04.2026" → ISO-8601 UTC string.
 * Returns undefined if the pattern does not match.
 */
export const parseEGEDate = (raw: string | undefined | null): string | undefined => {
  if (!raw) return undefined;
  const m = raw.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return undefined;
  const day = parseInt(m[1]!, 10);
  const month = parseInt(m[2]!, 10) - 1;
  const year = parseInt(m[3]!, 10);
  const d = new Date(Date.UTC(year, month, day));
  return d.toISOString();
};

// ============================================================================
// Dimension parsing
// ============================================================================

/** "162 cm / 5'4''" → 162. Also accepts bare "162". */
export const parseEGEHeightCm = (raw: string | undefined | null): number | undefined => {
  if (!raw) return undefined;
  const m = raw.match(/(\d+)\s*cm/i);
  if (m) return parseInt(m[1]!, 10);
  const bare = raw.trim().match(/^(\d+)$/);
  return bare ? parseInt(bare[1]!, 10) : undefined;
};

/** "55 kg / 121 lbs" → 55. Also accepts bare "55". */
export const parseEGEWeightKg = (raw: string | undefined | null): number | undefined => {
  if (!raw) return undefined;
  const m = raw.match(/(\d+)\s*kg/i);
  if (m) return parseInt(m[1]!, 10);
  const bare = raw.trim().match(/^(\d+)$/);
  return bare ? parseInt(bare[1]!, 10) : undefined;
};

// ============================================================================
// Slug / normalization helpers
// ============================================================================

/**
 * Convert a display string to a URL slug used for taxonomy lookups.
 * "Russian" → "russian", "Caucasian (white)" → "caucasian-white".
 */
export const slugify = (raw: string | undefined | null): string | undefined => {
  if (!raw) return undefined;
  return (
    raw
      .toLowerCase()
      .replace(/[()]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .trim() || undefined
  );
};

// ============================================================================
// Gender
// ============================================================================

const GENDER_MAP: Record<string, 'female' | 'male' | 'trans' | 'other'> = {
  female: 'female',
  male: 'male',
  trans: 'trans',
  transgender: 'trans',
  shemale: 'trans',
};

export const normalizeEGEGender = (
  raw: string | undefined | null,
): 'female' | 'male' | 'trans' | 'other' | undefined => {
  if (!raw) return undefined;
  return GENDER_MAP[raw.toLowerCase()] ?? 'other';
};

// ============================================================================
// Available for (incall / outcall)
// ============================================================================

export const parseEGEAvailableFor = (
  raw: string | undefined | null,
): { incall: boolean; outcall: boolean } => {
  if (!raw) return { incall: false, outcall: false };
  const lower = raw.toLowerCase();
  return {
    incall: lower.includes('incall'),
    outcall: lower.includes('outcall'),
  };
};

// ============================================================================
// Meeting with
// ============================================================================

const MEETING_KEYWORDS: Array<[RegExp, 'man' | 'woman' | 'couple' | 'group' | 'other']> = [
  [/\bman\b|\bgentleman\b/i, 'man'],
  [/\bwoman\b|\bladie\b|\bfemale\b/i, 'woman'],
  [/couple/i, 'couple'],
  [/group/i, 'group'],
];

export const parseEGEMeetingWith = (
  raw: string | undefined | null,
): Array<'man' | 'woman' | 'couple' | 'group' | 'other'> => {
  if (!raw) return [];
  const out = new Set<'man' | 'woman' | 'couple' | 'group' | 'other'>();
  for (const [re, kind] of MEETING_KEYWORDS) {
    if (re.test(raw)) out.add(kind);
  }
  return Array.from(out);
};

// ============================================================================
// Rate helpers
// ============================================================================

/**
 * Map duration label from the rates table → canonical price slot.
 * "0.5 Hour" → 'h0_5', "1 Hour" → 'h1', etc.
 */
export const parseDurationSlot = (label: string): PriceSlot => {
  const lower = label.toLowerCase().replace(/\s+/g, ' ').trim();
  if (lower.startsWith('0.5') || lower.startsWith('half')) return 'custom'; // no h0_5 in PriceSlot
  if (lower.startsWith('1 h')) return 'h1';
  if (lower.startsWith('2 h')) return 'h2';
  if (lower.startsWith('3 h')) return 'h3';
  if (lower.startsWith('6 h')) return 'custom'; // no h6 in PriceSlot
  if (lower.startsWith('12 h')) return 'h12';
  if (lower.startsWith('24 h') || lower === '24 hours' || lower === '1 day') return 'h24';
  if (lower.startsWith('48 h') || lower.startsWith('2 day')) return 'overnight'; // nearest fit
  return 'custom';
};

/**
 * Parse "600 MYR" or "130 EUR" (after &nbsp; → space) → { amount, currency }.
 * Returns undefined when no match.
 */
export const parseEGEAmount = (
  raw: string | undefined | null,
): { amount: number; currency: string } | undefined => {
  if (!raw) return undefined;
  const clean = raw.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  const m = clean.match(/^([\d,.]+)\s*([A-Z]{2,4})$/);
  if (!m) return undefined;
  const amount = parseFloat(m[1]!.replace(',', ''));
  if (!Number.isFinite(amount)) return undefined;
  return { amount, currency: m[2]! };
};

// ============================================================================
// Language list
// ============================================================================

/**
 * Parse a comma-or-slash-separated language string.
 * "English, Russian" → ["English", "Russian"]
 */
export const parseEGELanguages = (raw: string | undefined | null): string[] => {
  if (!raw) return [];
  return raw
    .split(/[,/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
};
