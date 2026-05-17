/**
 * Pure parsers for Erosguia payload fields.
 * No I/O, no DB — safe to unit-test in isolation.
 */

// ============================================================================
// Dimension parsing
// ============================================================================

/** "22 años" → 22. "30 años" → 30. */
export const parseErosguiaAge = (raw: string | undefined | null): number | undefined => {
  if (!raw) return undefined;
  const m = raw.match(/^(\d+)/);
  return m ? parseInt(m[1]!, 10) : undefined;
};

/** "160 cm." → 160. "172 cm." → 172. Bare "165" also accepted. */
export const parseErosguiaHeightCm = (raw: string | undefined | null): number | undefined => {
  if (!raw) return undefined;
  const m = raw.match(/(\d+)\s*cm/i);
  if (m) return parseInt(m[1]!, 10);
  const bare = raw.trim().match(/^(\d+)$/);
  return bare ? parseInt(bare[1]!, 10) : undefined;
};

// ============================================================================
// Slug / normalization helpers
// ============================================================================

/** "Colombiana" → "colombiana", "Española" → "espanola" (NFD strip). */
export const slugifyErosguia = (raw: string | undefined | null): string | undefined => {
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
 * Extract call phone from page title.
 * "Anny, Escort en Madrid - 614 246 033 - EROSGUIA" → "614246033"
 */
export const parseErosguiaPhoneFromTitle = (title: string | undefined | null): string | undefined => {
  if (!title) return undefined;
  const m = title.match(/[-–]\s*(\d{3}[\s ]\d{3}[\s ]\d{3})\s*[-–]/);
  if (!m) return undefined;
  return m[1]!.replace(/\s| /g, '');
};

/**
 * Extract E.164 phone from a WhatsApp wa.me href.
 * "https://wa.me/34643435399?text=..." → "+34643435399"
 */
export const extractErosguiaWhatsappPhone = (href: string | undefined | null): string | undefined => {
  if (!href) return undefined;
  const m = href.match(/wa\.me\/(\d+)/);
  return m ? `+${m[1]!}` : undefined;
};

// ============================================================================
// Language parsing
// ============================================================================

/**
 * Parse comma-separated language display names.
 * "Español, Inglés" → ["Español", "Inglés"]
 */
export const parseErosguiaLanguages = (raw: string | undefined | null): string[] => {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};
