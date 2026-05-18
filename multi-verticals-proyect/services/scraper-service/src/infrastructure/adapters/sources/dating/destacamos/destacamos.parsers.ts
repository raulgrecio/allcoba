/**
 * Pure parsers for destacamos.net payload fields.
 */

/**
 * Extract numeric ID from URL.
 * "/92345-elena-escort-madrid.html" → "92345"
 * "/opiniones/92345" → "92345"
 */
export const parseSourceIdFromUrl = (url: string): string => {
  const bySlug = url.match(/\/(\d+)-/);
  if (bySlug) return bySlug[1]!;
  const byOpiniones = url.match(/\/opiniones\/(\d+)/);
  if (byOpiniones) return byOpiniones[1]!;
  const byDetails = url.match(/[?&]id=(\d+)/);
  if (byDetails) return byDetails[1]!;
  return url.split('/').filter(Boolean).pop()?.replace(/\D/g, '') ?? '';
};

/** NFD slugify for taxonomy resolver. */
export const slugifyDestacamos = (raw: string | undefined | null): string | undefined => {
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

/** "26" → 26. "26 años" → 26. */
export const parseDestacamosAge = (raw: string | undefined | null): number | undefined => {
  if (!raw) return undefined;
  const m = raw.match(/(\d+)/);
  return m ? parseInt(m[1]!, 10) : undefined;
};

/**
 * Parse height in cm from "entre 1'60 y 1'70" → 160.
 * Takes the lower bound.
 */
export const parseDestacamosHeightCm = (raw: string | undefined | null): number | undefined => {
  if (!raw) return undefined;
  const m = raw.match(/(\d+)'(\d{2})/);
  return m ? parseInt(m[1]!, 10) * 100 + parseInt(m[2]!, 10) : undefined;
};

/**
 * Split comma-separated languages.
 * "Español, Inglés" → ["Español", "Inglés"]
 */
export const parseDestacamosLanguages = (raw: string | undefined | null): string[] => {
  if (!raw) return [];
  return raw.split(',').map((l) => l.trim()).filter(Boolean);
};

/**
 * Extract E.164 phone from WhatsApp href.
 */
export const extractDestacamosWhatsappPhone = (
  href: string | undefined | null,
): string | undefined => {
  if (!href) return undefined;
  const byParam = href.match(/[?&]phone=(\d+)/);
  if (byParam) return `+${byParam[1]!}`;
  const byWame = href.match(/wa\.me\/(\d+)/);
  if (byWame) return `+${byWame[1]!}`;
  return undefined;
};
