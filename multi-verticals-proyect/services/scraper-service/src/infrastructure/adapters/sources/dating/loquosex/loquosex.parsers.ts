/**
 * Pure parsers for Loquosex payload fields.
 * No I/O, no DB — safe to unit-test in isolation.
 */

// ============================================================================
// Title / nickname parsing
// ============================================================================

/**
 * Extract display name from an ad title.
 * Strips the 9-digit phone and anything after the first comma.
 *
 * "Maria, Escort de lujo 600777888" → "Maria"
 * "JOVEN Y GUAPA 677684329, HAGO TODO LOS SERVICIOS" → "JOVEN Y GUAPA"
 */
export const parseNicknameFromTitle = (title: string | undefined | null): string => {
  if (!title) return '';
  const beforeComma = title.split(',')[0] ?? title;
  return beforeComma.replace(/\d{9,}/, '').trim();
};

// ============================================================================
// Dimension / price parsing
// ============================================================================

/** "25 años" → 25. "24 años" → 24. */
export const parseLoquosexAge = (raw: string | undefined | null): number | undefined => {
  if (!raw) return undefined;
  const m = raw.match(/(\d+)/);
  return m ? parseInt(m[1]!, 10) : undefined;
};

/** "50 €" → 50. "100 €" → 100. */
export const parseLoquosexMinPrice = (raw: string | undefined | null): number | undefined => {
  if (!raw) return undefined;
  const m = raw.match(/(\d+)/);
  return m ? parseInt(m[1]!, 10) : undefined;
};

// ============================================================================
// Slug / normalization helpers
// ============================================================================

/** "Venezolana" → "venezolana", "Española" → "espanola" (NFD strip). */
export const slugifyLoquosex = (raw: string | undefined | null): string | undefined => {
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

// ============================================================================
// Phone parsing
// ============================================================================

/**
 * Extract 9-digit phone from URL slug.
 * "/ven-a-conocerme-677684329.html/" → "677684329"
 */
export const parseSourceIdFromUrl = (url: string): string => {
  const m = url.match(/(\d{9,})[^/]*\.html/);
  if (m) return m[1]!;
  return (
    url
      .split('/')
      .filter(Boolean)
      .pop()
      ?.replace(/\.html?\/?$/, '') ?? ''
  );
};

/**
 * Normalize phone from .numero-telefono text (digits only).
 * "677 684 329" → "677684329"
 */
export const normalizeLoquosexPhone = (raw: string | undefined | null): string | undefined => {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, '');
  return digits || undefined;
};

/**
 * Extract E.164 phone from WhatsApp href.
 * Supports both api.whatsapp.com/send?phone= and wa.me/ formats.
 * "https://api.whatsapp.com/send?phone=34677684329&text=..." → "+34677684329"
 */
export const extractLoquosexWhatsappPhone = (
  href: string | undefined | null,
): string | undefined => {
  if (!href) return undefined;
  const byParam = href.match(/[?&]phone=(\d+)/);
  if (byParam) return `+${byParam[1]!}`;
  const byWame = href.match(/wa\.me\/(\d+)/);
  if (byWame) return `+${byWame[1]!}`;
  return undefined;
};

// ============================================================================
// Meeting places inference
// ============================================================================

/**
 * Infer incall/outcall from bio text.
 * "Tengo piso Privado. También hago salidas a hoteles." → {incall:true, outcall:true}
 */
export const parseLoquosexMeetingPlaces = (
  bio: string | undefined | null,
): { incall: boolean; outcall: boolean } => {
  const text = (bio ?? '').toLowerCase();
  const incall = /piso|apartamento|mi casa/.test(text);
  const outcall = /hotel|domicilio|salida/.test(text);
  return { incall, outcall };
};
