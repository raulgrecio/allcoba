/**
 * Pure parsers for GirlsBCN / GirlsMadrid payload fields.
 * No I/O, no DB — safe to unit-test in isolation.
 */

// ============================================================================
// Dimension parsing
// ============================================================================

/** "160 cm." → 160. "172 cm." → 172. Bare "160" also accepted. */
export const parseGBCNHeightCm = (raw: string | undefined | null): number | undefined => {
  if (!raw) return undefined;
  const m = raw.match(/(\d+)\s*cm/i);
  if (m) return parseInt(m[1]!, 10);
  const bare = raw.trim().match(/^(\d+)$/);
  return bare ? parseInt(bare[1]!, 10) : undefined;
};

/** "55 Kg." → 55. "58 Kg." → 58. */
export const parseGBCNWeightKg = (raw: string | undefined | null): number | undefined => {
  if (!raw) return undefined;
  const m = raw.match(/(\d+)\s*k/i);
  if (m) return parseInt(m[1]!, 10);
  const bare = raw.trim().match(/^(\d+)$/);
  return bare ? parseInt(bare[1]!, 10) : undefined;
};

/** "25 años" → 25. "22 años" → 22. */
export const parseGBCNAge = (raw: string | undefined | null): number | undefined => {
  if (!raw) return undefined;
  const m = raw.match(/^(\d+)/);
  return m ? parseInt(m[1]!, 10) : undefined;
};

// ============================================================================
// Measurements parsing
// ============================================================================

/**
 * Parse "80 - 60 - 95" → { bustCm: 80, waistCm: 60, hipCm: 95 }.
 * Returns empty object if pattern does not match.
 */
export const parseGBCNMeasurements = (
  raw: string | undefined | null,
): { bustCm?: number; waistCm?: number; hipCm?: number } => {
  if (!raw) return {};
  const parts = raw.split(/\s*[-–]\s*/).map((s) => parseInt(s.trim(), 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return {};
  return { bustCm: parts[0], waistCm: parts[1], hipCm: parts[2] };
};

// ============================================================================
// Slug / normalization helpers
// ============================================================================

/** "Negro" → "negro", "Marrones" → "marrones", "Colombiana" → "colombiana". */
export const slugifyGBCN = (raw: string | undefined | null): string | undefined => {
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
// Phone normalization
// ============================================================================

/**
 * Normalize a raw phone string to digits only.
 * "663-475-960" → "663475960", "663475960" → "663475960".
 */
export const normalizeGBCNPhone = (raw: string | undefined | null): string | undefined => {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, '');
  return digits || undefined;
};

/**
 * Extract E.164 phone from a WhatsApp `wa.me` href.
 * "https://wa.me/34663475960?text=..." → "+34663475960"
 */
export const extractWhatsappPhone = (href: string | undefined | null): string | undefined => {
  if (!href) return undefined;
  const m = href.match(/wa\.me\/(\d+)/);
  return m ? `+${m[1]!}` : undefined;
};

// ============================================================================
// Meeting-place parsing
// ============================================================================

/**
 * Infer incall/outcall from free-text meeting description.
 * Checks for "apartamento", "piso" (incall) and "tu casa", "hotel" (outcall).
 */
export const parseGBCNMeetingPlaces = (
  text: string | undefined | null,
  meetingTags?: string[],
): { incall: boolean; outcall: boolean } => {
  const haystack = [text ?? '', ...(meetingTags ?? [])].join(' ').toLowerCase();
  const incall = /apartamento|piso\b|mi casa/.test(haystack);
  const outcall = /tu casa|hotel|velada|viaje/.test(haystack);
  return { incall, outcall };
};
