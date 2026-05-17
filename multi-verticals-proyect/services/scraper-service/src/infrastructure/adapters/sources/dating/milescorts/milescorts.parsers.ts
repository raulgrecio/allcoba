/**
 * Pure parsers for milescorts.es payload fields.
 */

/**
 * Extract numeric ad ID (last digit segment) from filename.
 * "/escorts-y-putas/madrid-ciudad/631594827-escort-sexy-396681.htm" → "396681"
 */
export const parseSourceIdFromUrl = (url: string): string => {
  const filename = url.split('/').pop()?.split('?')[0] ?? '';
  const m = filename.match(/(\d+)\.html?$/);
  if (m) return m[1]!;
  const lastDigits = filename.match(/(\d+)[^-\d]*$/);
  return lastDigits?.[1] ?? filename.replace(/\.html?$/, '');
};

/**
 * Extract 9-digit phone from URL filename (first digit segment).
 * "631594827-escort-sexy-396681.htm" → "631594827"
 */
export const parsePhoneFromUrl = (url: string): string | undefined => {
  const filename = url.split('/').pop()?.split('?')[0] ?? '';
  const m = filename.match(/^(\d{9,})/);
  return m?.[1] ?? undefined;
};

/**
 * Extract city slug from URL penultimate path segment.
 * "/escorts-y-putas/madrid-ciudad/..." → "madrid-ciudad"
 */
export const parseCitySlugFromUrl = (url: string): string | undefined => {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    if (parts.length >= 2) return parts[parts.length - 2] ?? undefined;
  } catch {
    const parts = url.split('/').filter(Boolean);
    if (parts.length >= 2) return parts[parts.length - 2] ?? undefined;
  }
  return undefined;
};

/** "madrid-ciudad" → "madrid ciudad" (for display / resolver) */
export const citySlugToName = (slug: string): string => slug.replace(/-/g, ' ');

/** NFD slugify for taxonomy resolver. */
export const slugifyMilescorts = (raw: string | undefined | null): string | undefined => {
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

/** "Tania, escort sexy en tu zona" → "Tania" */
export const parseNicknameFromTitle = (title: string | undefined | null): string => {
  if (!title) return '';
  return (title.split(/[,–-]/)[0] ?? title).trim();
};

/** "24 años" → 24 */
export const parseMilescortsAge = (raw: string | undefined | null): number | undefined => {
  if (!raw) return undefined;
  const m = raw.match(/(\d+)/);
  return m ? parseInt(m[1]!, 10) : undefined;
};

/**
 * Extract E.164 phone from WhatsApp href.
 * "https://wa.me/34631594827" → "+34631594827"
 */
export const extractMilescortsWhatsappPhone = (
  href: string | undefined | null,
): string | undefined => {
  if (!href) return undefined;
  const byParam = href.match(/[?&]phone=(\d+)/);
  if (byParam) return `+${byParam[1]!}`;
  const byWame = href.match(/wa\.me\/(\d+)/);
  if (byWame) return `+${byWame[1]!}`;
  return undefined;
};
