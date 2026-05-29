/**
 * Pure parsers for ardienteplacer.com payload fields.
 */

/**
 * Extract ad ID (last path segment) from URL.
 * "/escort/category/madrid/632277902/92010" → "92010"
 */
export const parseSourceIdFromUrl = (url: string): string => {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? '';
  } catch {
    return url.split('/').filter(Boolean).pop() ?? '';
  }
};

/**
 * Extract phone from URL (4th path segment).
 * "/escort/category/madrid/632277902/92010" → "632277902"
 */
export const parsePhoneFromUrl = (url: string): string | undefined => {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    // parts: [escort, category, city, phone, id]
    if (parts.length >= 4 && /^\d{9,}$/.test(parts[parts.length - 2]!)) {
      return parts[parts.length - 2]!;
    }
  } catch {
    /* ignore */
  }
  return undefined;
};

/**
 * Extract city slug from URL (3rd path segment).
 * "/escort/category/madrid/632277902/92010" → "madrid"
 */
export const parseCityFromUrl = (url: string): string | undefined => {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    // parts: [escort, category, city, phone, id]
    if (parts.length >= 5) return parts[parts.length - 3]!.replace(/-/g, ' ');
  } catch {
    /* ignore */
  }
  return undefined;
};

/** NFD slugify for taxonomy resolver. */
export const slugifyArdienteplacer = (raw: string | undefined | null): string | undefined => {
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

/** "Carmen - Escort independiente Madrid" → "Carmen" */
export const parseNicknameFromTitle = (title: string | undefined | null): string => {
  if (!title) return '';
  return (title.split(/\s*[-–]\s*/)[0] ?? title).trim();
};

/** "28 años" → 28 */
export const parseArdientePlacerAge = (raw: string | undefined | null): number | undefined => {
  if (!raw) return undefined;
  const m = raw.match(/(\d+)/);
  return m ? parseInt(m[1]!, 10) : undefined;
};

/** "80 €/hora" → 80 */
export const parseArdientePlacerRate = (raw: string | undefined | null): number | undefined => {
  if (!raw) return undefined;
  const m = raw.match(/(\d+)\s*€\/(hora|h)\b/i);
  return m ? parseInt(m[1]!, 10) : undefined;
};

/**
 * Extract E.164 phone from WhatsApp href.
 * "https://wa.me/34632277902?text=..." → "+34632277902"
 */
export const extractArdientePlacerWhatsappPhone = (
  href: string | undefined | null,
): string | undefined => {
  if (!href) return undefined;
  const byParam = href.match(/[?&]phone=(\d+)/);
  if (byParam) return `+${byParam[1]!}`;
  const byWame = href.match(/wa\.me\/(\d+)/);
  if (byWame) return `+${byWame[1]!}`;
  return undefined;
};
