/**
 * Pure parsers for citapasion.com raw payload fields.
 */

/** Extract numeric ID from URL: /escorts/{numericId} → numericId */
export const parseSourceIdFromUrl = (url: string): string => {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? url;
};

/** Normalize phone from data-href="tel:+34XXXXXXXXX" or href="tel:..." → 9-digit Spanish. */
export const parseCitapasionPhone = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined;
  const digits = raw.replace(/^tel:/i, '').replace(/\D/g, '');
  if (digits.startsWith('34') && digits.length === 11) return digits.slice(2);
  if (digits.length === 9) return digits;
  return undefined;
};

/** Parse WhatsApp phone from wa.me href. */
export const parseCitapasionWhatsapp = (href: string | undefined): string | undefined => {
  if (!href) return undefined;
  const match = href.match(/wa\.me\/(\d+)/);
  if (!match) return undefined;
  const digits = match[1]!;
  if (digits.startsWith('34') && digits.length === 11) return digits.slice(2);
  if (digits.length === 9) return digits;
  return undefined;
};

/** Parse integer from text like "25 años" → 25. */
export const parseFirstInt = (text: string | undefined): number | undefined => {
  if (!text) return undefined;
  const match = text.match(/\d+/);
  const n = match ? parseInt(match[0], 10) : undefined;
  return n && n > 0 ? n : undefined;
};

/** Normalize boolean from "Si"/"No" → true/false. */
export const parseBoolAttr = (text: string | undefined): boolean | undefined => {
  if (!text) return undefined;
  const lower = text.toLowerCase();
  if (lower === 'si' || lower === 'sí') return true;
  if (lower === 'no') return false;
  return undefined;
};

/** Parse rating score from CSS custom property style="--rating: 4.5". */
export const parseRatingScore = (style: string | undefined): number | undefined => {
  if (!style) return undefined;
  const match = style.match(/--rating:\s*([\d.]+)/);
  return match ? parseFloat(match[1]!) : undefined;
};

/** Parse rating count from "(123)" text. */
export const parseRatingCount = (text: string | undefined): number | undefined => {
  if (!text) return undefined;
  const match = text.match(/\((\d+)\)/);
  return match ? parseInt(match[1]!, 10) : 0;
};

/** Parse nickname: first meaningful word from title (before "|" separator). */
export const parseNicknameFromTitle = (title: string): string | undefined => {
  const clean = title.split('|')[0]?.trim() ?? '';
  const first = clean.split(/\s+/)[0]?.replace(/[,;:]+$/, '').trim();
  return first || undefined;
};
