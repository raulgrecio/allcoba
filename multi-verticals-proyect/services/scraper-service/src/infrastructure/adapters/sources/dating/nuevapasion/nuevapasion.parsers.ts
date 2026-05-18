/**
 * Pure parsers for nuevapasion.com raw payload fields.
 */

/** Extract slug from URL: /anuncio/{slug} → slug */
export const parseSourceIdFromUrl = (url: string): string => {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? url;
};

/** Strip tel: prefix and normalize to digits-only 9-digit Spanish phone. */
export const parseNuevapasionPhone = (href: string | undefined): string | undefined => {
  if (!href) return undefined;
  const digits = href.replace('tel:', '').replace(/\D/g, '');
  if (digits.startsWith('34') && digits.length === 11) return digits.slice(2);
  if (digits.length === 9) return digits;
  return undefined;
};

/** Parse nickname: first word of title. */
export const parseNicknameFromTitle = (title: string): string | undefined => {
  const first = title.split(/\s+/)[0]?.replace(/[,;:]+$/, '').trim();
  return first || undefined;
};
