/**
 * Pure parsers for bluemove.es raw payload fields.
 */

/** Extract numeric ID from URL hash: /madrid/escorts/#49049 → 49049 */
export const parseSourceIdFromUrl = (url: string): string => {
  const hash = new URL(url).hash.slice(1);
  if (hash) return hash;
  // Fallback: last path segment
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? url;
};

/** Extract city from URL path: /madrid/escorts/#id → madrid */
export const parseCityFromUrl = (url: string): string | undefined => {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  const escIdx = parts.indexOf('escorts');
  if (escIdx >= 1) return parts[escIdx - 1]!.replace(/-/g, ' ');
  return undefined;
};

/** Normalize phone from href="tel:+34XXXXXXXXX" → 9-digit Spanish. */
export const parseBluemovePhone = (href: string | undefined): string | undefined => {
  if (!href) return undefined;
  const digits = href.replace(/^tel:/i, '').replace(/\D/g, '');
  if (digits.startsWith('34') && digits.length === 11) return digits.slice(2);
  if (digits.length === 9) return digits;
  return undefined;
};

/** Parse WhatsApp phone from wa.me href. */
export const parseBluemoveWhatsapp = (href: string | undefined): string | undefined => {
  if (!href) return undefined;
  const match = href.match(/wa\.me\/(\d+)/);
  if (!match) return undefined;
  const digits = match[1]!;
  if (digits.startsWith('34') && digits.length === 11) return digits.slice(2);
  if (digits.length === 9) return digits;
  return undefined;
};

/** Parse Telegram username from t.me href. */
export const parseTelegramHandle = (href: string | undefined): string | undefined => {
  if (!href) return undefined;
  const match = href.match(/t\.me\/([^/?]+)/);
  return match?.[1] ?? undefined;
};

/** Parse Instagram handle from instagram.com href. */
export const parseInstagramHandle = (href: string | undefined): string | undefined => {
  if (!href) return undefined;
  const match = href.match(/instagram\.com\/([^/?]+)/);
  return match?.[1] ?? undefined;
};

/** Extract nickname from img alt: "BEATRIZ, Escort en Madrid" → "Beatriz". */
export const parseNicknameFromAlt = (alt: string | undefined): string | undefined => {
  if (!alt) return undefined;
  const raw = alt.split(',')[0]?.trim() ?? '';
  if (!raw) return undefined;
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
};

/** Parse integer from text like "25 años" → 25. */
export const parseFirstInt = (text: string | undefined): number | undefined => {
  if (!text) return undefined;
  const match = text.match(/\d+/);
  const n = match ? parseInt(match[0], 10) : undefined;
  return n && n > 0 ? n : undefined;
};

/** Parse boolean from "No|Si" (tattoos/piercings): true if not "no". */
export const parseBoolNotNo = (text: string | undefined): boolean | undefined => {
  if (!text) return undefined;
  return !/no/i.test(text);
};

/** Strip province in parens: "Madrid (Madrid)" → "Madrid". */
export const stripProvince = (city: string | undefined): string | undefined => {
  if (!city) return undefined;
  return city.replace(/\s*\([^)]*\)/, '').trim() || undefined;
};
