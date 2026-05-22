/**
 * Pure parsers for hotvalencia.com raw payload fields.
 */

/** Extract slug from URL: /putas-valencia/{slug}/ → slug */
export const parseSourceIdFromUrl = (url: string): string => {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? url;
};

/** Normalize phone from href="tel:..." → 9-digit Spanish. */
export const parseHotvalenciaPhone = (href: string | undefined): string | undefined => {
  if (!href) return undefined;
  const digits = href.replace(/^tel:/i, '').replace(/\D/g, '');
  if (digits.startsWith('34') && digits.length === 11) return digits.slice(2);
  if (digits.length === 9) return digits;
  return undefined;
};

/** Parse nickname from title: first word. */
export const parseNicknameFromTitle = (title: string): string | undefined => {
  const first = title
    .split(/\s+/)[0]
    ?.replace(/[,;:]+$/, '')
    .trim();
  return first || undefined;
};
