/**
 * Pure parsers for escort-advisor.xxx raw payload fields.
 */

/**
 * Extract sourceId from URL.
 * Profile: /escorts/{country}/{city}/{slug}/ → slug
 * Or numeric ID from end: /.../{slug}-{id}/ → id
 */
export const parseSourceIdFromUrl = (url: string): string => {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  const slug = parts[parts.length - 1] ?? url;
  // Prefer numeric id at end: "lucia-escort-456" → "456"
  const numMatch = slug.match(/(\d+)$/);
  return numMatch ? numMatch[1]! : slug;
};

/** Normalize phone from tel: href → 9-digit Spanish. */
export const parseEscortAdvisorPhone = (href: string | undefined): string | undefined => {
  if (!href) return undefined;
  const digits = href.replace(/^tel:/i, '').replace(/\D/g, '');
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

/**
 * Extract city from breadcrumb links.
 * Breadcrumb: Home → España → Madrid → Profile
 * City is typically 3rd breadcrumb item (index 2).
 */
export const parseCityFromBreadcrumb = (items: string[]): string | undefined => {
  return items[2]?.trim() || undefined;
};
