/**
 * Pure parsers for gemidos.tv raw payload fields.
 */

/** Extract slug from URL: /anuncio/{slug}/ → slug */
export const parseSourceIdFromUrl = (url: string): string => {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? url;
};

/** Normalize phone: strip non-digits, validate 9+ digit Spanish number. */
export const parseGemidosPhone = (text: string | undefined): string | undefined => {
  if (!text) return undefined;
  const digits = text.replace(/\D/g, '');
  if (digits.startsWith('34') && digits.length === 11) return digits.slice(2);
  if (digits.length === 9) return digits;
  return undefined;
};

/** Parse integer from text like "25 Años" → 25. */
export const parseFirstInt = (text: string | undefined): number | undefined => {
  if (!text) return undefined;
  const match = text.match(/\d+/);
  const n = match ? parseInt(match[0], 10) : undefined;
  return n && n > 0 ? n : undefined;
};

/**
 * Extract nickname from title: first word after optional emojis/punctuation.
 * "🔥 Sofia escort" → "Sofia"
 */
export const parseNicknameFromTitle = (title: string): string | undefined => {
  const match = title.match(/^(?:[^\w\s]*\s*)?(\w+)/);
  return match?.[1] ?? undefined;
};
