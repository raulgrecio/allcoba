/**
 * Pure parsers for milpasiones.com payload fields.
 */

/**
 * Extract ad ID from URL: _(\d+) before trailing slash.
 * "/anuncio/662583238-elena_215990/" → "215990"
 */
export const parseSourceIdFromUrl = (url: string): string => {
  const m = url.match(/_(\d+)\/?(?:\?|#|$)/);
  if (m) return m[1]!;
  // Fallback: last path segment
  return (
    url
      .split('/')
      .filter(Boolean)
      .pop()
      ?.replace(/[^0-9]/g, '') ?? ''
  );
};

/**
 * Extract 9-digit phone from URL filename (before first "-").
 * "/anuncio/662583238-elena-slug_215990/" → "662583238"
 */
export const parsePhoneFromUrl = (url: string): string | undefined => {
  const anuncioMatch = url.match(/\/anuncio\/(\d{9,})/);
  if (anuncioMatch) return anuncioMatch[1]!;
  return undefined;
};

/** NFD slugify for taxonomy resolver. */
export const slugifyMilpasiones = (raw: string | undefined | null): string | undefined => {
  if (!raw) return undefined;
  return (
    raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .trim() || undefined
  );
};

/**
 * Extract nickname from og:title.
 * "662583238 NATALIA CARINOSA MORBOSA EN ESTEPONA" → "NATALIA"
 * Strips leading phone number, takes first non-phone word.
 */
export const parseNicknameFromTitle = (title: string | undefined | null): string => {
  if (!title) return '';
  const withoutPhone = title.replace(/^\d{9,}\s*/, '').trim();
  // First word before space or comma
  const parts = withoutPhone.split(/[\s,]+/);
  return (parts[0] || '').trim();
};
