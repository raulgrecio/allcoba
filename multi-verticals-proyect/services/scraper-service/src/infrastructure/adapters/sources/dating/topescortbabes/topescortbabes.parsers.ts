/**
 * Pure parsers for TopEscortBabes raw payload fields.
 *
 * Each function takes a raw value and returns a typed canonical value.
 * No I/O, no DB, no logger — safe to unit-test in isolation.
 */

import type { HtmlString } from './topescortbabes.types.js';

// ============================================================================
// HTML link parsing for personalDetails fields
// ============================================================================

/** Strip every HTML tag, decode common entities, trim whitespace. */
export const stripHtml = (html: HtmlString | string | undefined): string | undefined => {
  if (!html) return undefined;
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Extract the SEO slug from a personalDetails HTML link.
 *
 * Example href: `https://topescortbabes.com/es/madrid/escorts/venezuelan-nationality`
 *                                                              ^^^^^^^^^^ ← slug
 *
 * The trailing `-<taxonomy>` suffix is stripped (nationality, ethnic, hair,
 * eyes, sexuality, age, height, weight).
 */
export const extractTaxonomySlug = (
  html: HtmlString | string | undefined,
  taxonomySuffix:
    | 'nationality'
    | 'ethnic'
    | 'hair'
    | 'eyes'
    | 'sexuality'
    | 'age'
    | 'height'
    | 'weight',
): string | undefined => {
  if (!html) return undefined;
  const hrefMatch = html.match(/href="[^"]*\/escorts\/([^"/]+)"/);
  if (!hrefMatch) return undefined;
  const last = hrefMatch[1];
  if (!last) return undefined;
  const suffix = `-${taxonomySuffix}`;
  return last.endsWith(suffix) ? last.slice(0, -suffix.length) : last;
};

/** First integer found in a string, or undefined. */
export const parseFirstInt = (s: string | undefined): number | undefined => {
  if (!s) return undefined;
  const m = s.match(/-?\d+/);
  return m ? parseInt(m[0], 10) : undefined;
};

/** Both "165cm / 5'5\"" → 165, and bare "54" → 54. */
export const parseHeightCm = (html: HtmlString | string | undefined): number | undefined => {
  return parseFirstInt(stripHtml(html));
};

export const parseWeightKg = (html: HtmlString | string | undefined): number | undefined => {
  return parseFirstInt(stripHtml(html));
};

// ============================================================================
// Date / time parsing
// ============================================================================

const SPANISH_MONTHS: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

/**
 * Parse "Actualizado el 01 septiembre, 2025" → ISO-8601 UTC.
 * Returns undefined if pattern doesn't match.
 */
export const parseHumanDateEs = (raw: string | undefined | null): string | undefined => {
  if (!raw) return undefined;
  const m = raw.match(/(\d{1,2})\s+([a-záéíóúñ]+),?\s+(\d{4})/i);
  if (!m) return undefined;
  const day = parseInt(m[1]!, 10);
  const month = SPANISH_MONTHS[m[2]!.toLowerCase()];
  const year = parseInt(m[3]!, 10);
  if (month === undefined) return undefined;
  const d = new Date(Date.UTC(year, month, day));
  return d.toISOString();
};

const RELATIVE_UNITS_ES: Record<string, number> = {
  segundo: 1000,
  segundos: 1000,
  minuto: 60_000,
  minutos: 60_000,
  hora: 3_600_000,
  horas: 3_600_000,
  día: 86_400_000,
  días: 86_400_000,
  dia: 86_400_000,
  dias: 86_400_000,
  semana: 604_800_000,
  semanas: 604_800_000,
  mes: 2_592_000_000,
  meses: 2_592_000_000,
  año: 31_536_000_000,
  años: 31_536_000_000,
  ano: 31_536_000_000,
  anos: 31_536_000_000,
};

/**
 * Parse "hace 4 días" / "activo hace 4 días" → ISO-8601 (approx) relative to `now`.
 * Returns undefined when pattern doesn't match.
 */
export const parseRelativeTimeEs = (
  raw: string | undefined | null,
  now: Date = new Date(),
): string | undefined => {
  if (!raw) return undefined;
  const m = raw.match(/hace\s+(\d+)\s+([a-záéíóúñ]+)/i);
  if (!m) return undefined;
  const amount = parseInt(m[1]!, 10);
  const unit = RELATIVE_UNITS_ES[m[2]!.toLowerCase()];
  if (unit === undefined) return undefined;
  return new Date(now.getTime() - amount * unit).toISOString();
};

// ============================================================================
// ContactOption normalization
// ============================================================================

const CONTACT_OPTION_MAP: Record<string, 'calls' | 'sms' | 'whatsapp' | 'telegram'> = {
  Calls: 'calls',
  SMS: 'sms',
  Whatsapp: 'whatsapp',
  WhatsApp: 'whatsapp',
  Telegram: 'telegram',
};

export const normalizeContactOption = (
  raw: string,
): 'calls' | 'sms' | 'whatsapp' | 'telegram' | null => {
  return CONTACT_OPTION_MAP[raw] ?? null;
};

// ============================================================================
// PriceLabel → PriceSlot
// ============================================================================

const PRICE_SLOT_MAP: Record<string, 'h1' | 'h2' | 'h3' | 'h12' | 'h24'> = {
  '1 hora': 'h1',
  '2 horas': 'h2',
  '3 horas': 'h3',
  '12 horas': 'h12',
  '24 horas': 'h24',
};

export const labelToPriceSlot = (label: string): 'h1' | 'h2' | 'h3' | 'h12' | 'h24' | 'custom' => {
  return PRICE_SLOT_MAP[label] ?? 'custom';
};

// ============================================================================
// MeetingWith — "encuentro con un hombre y una pareja" → ['man', 'couple']
// ============================================================================

const MEETING_WITH_KEYWORDS: Array<[RegExp, 'man' | 'woman' | 'couple' | 'group' | 'other']> = [
  [/hombre/i, 'man'],
  [/mujer/i, 'woman'],
  [/pareja/i, 'couple'],
  [/grupo/i, 'group'],
];

export const parseMeetingWith = (
  raw: string | undefined,
): Array<'man' | 'woman' | 'couple' | 'group' | 'other'> => {
  if (!raw) return [];
  const out = new Set<'man' | 'woman' | 'couple' | 'group' | 'other'>();
  for (const [re, code] of MEETING_WITH_KEYWORDS) {
    if (re.test(raw)) out.add(code);
  }
  return Array.from(out);
};

// ============================================================================
// Gender — Schema.org Person.gender → canonical Gender
// ============================================================================

const GENDER_MAP: Record<string, 'female' | 'male' | 'trans' | 'other'> = {
  Female: 'female',
  Male: 'male',
  female: 'female',
  male: 'male',
};

export const normalizeGender = (
  schemaGender: string | undefined,
  badges?: { trans?: boolean },
): 'female' | 'male' | 'trans' | 'other' | undefined => {
  if (badges?.trans) return 'trans';
  if (!schemaGender) return undefined;
  return GENDER_MAP[schemaGender] ?? 'other';
};
