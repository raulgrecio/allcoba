/**
 * Pure parsers for mundosexanuncio.com raw payload fields.
 */

/** Profile URL: /contactos-mujeres/{slug}-{id} → id (numeric suffix). */
export const parseSourceIdFromUrl = (url: string): string => {
  const m = new URL(url).pathname.match(/-(\d+)\/?$/);
  if (m) return m[1]!;
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? url;
};

const toSpanishMobile = (digits: string): string | undefined => {
  if (digits.startsWith('34') && digits.length === 11) return digits.slice(2);
  if (digits.length === 9) return digits;
  return undefined;
};

/** Normalize phone from href="tel://NNNNNNNNN". */
export const parseMundoPhone = (href: string | undefined): string | undefined => {
  if (!href) return undefined;
  return toSpanishMobile(href.replace(/^tel:\/*/i, '').replace(/\D/g, ''));
};

/** Parse WhatsApp phone from api.whatsapp.com/send?phone=34XXXXXXXXX. */
export const parseMundoWhatsapp = (href: string | undefined): string | undefined => {
  if (!href) return undefined;
  const m = href.match(/[?&]phone=(\d+)/);
  return m ? toSpanishMobile(m[1]!) : undefined;
};

/** Infer age from free-text bio: "de 19 años" → 19. */
export const parseAgeFromText = (text: string | undefined): number | undefined => {
  if (!text) return undefined;
  const m = text.match(/\b(1[89]|[2-5]\d)\s*a[nñ]os?\b/i);
  const n = m ? parseInt(m[1]!, 10) : undefined;
  return n && n > 0 ? n : undefined;
};

export const slugifyMundo = (str: string | undefined): string | undefined => {
  if (!str) return undefined;
  const slug = str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || undefined;
};
