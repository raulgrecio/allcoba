// URL pattern: https://www.chicasmalas.es/{slug}/
// slug encodes: {name-parts...}-{city}-{9-digit-phone}
// e.g. "maria-escort-espanola-en-orihuela-697394223"

export function parseSourceIdFromUrl(url: string): string {
  const segments = new URL(url).pathname.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? '';
}

export function parsePhoneFromSlug(slug: string): string | undefined {
  const m = slug.match(/(\d{9})$/);
  return m?.[1];
}

export function parseCityFromSlug(slug: string): string | undefined {
  // Strip trailing 9-digit phone block, return last hyphen segment
  const withoutPhone = slug.replace(/-\d{9}$/, '');
  const parts = withoutPhone.split('-');
  return parts[parts.length - 1] || undefined;
}

export function parseNicknameFromMetaTitle(title: string): string | undefined {
  if (!title) return undefined;
  // "María Escort Española En Orihuela — Discreción Y Placer." → "María"
  const first = title.split(/[\s,—\-|]/)[0]?.trim() ?? '';
  return first || undefined;
}

export function parseChicasmalasPhone(href: string): string | undefined {
  // tel:+34697394223  tel://697394223  tel:697394223
  const digits = href.replace(/^tel[:/]+/i, '').replace(/\D/g, '');
  if (digits.startsWith('34') && digits.length === 11) return digits.slice(2);
  if (digits.length === 9) return digits;
  return undefined;
}

export function parseChicasmalasWhatsapp(href: string): string | undefined {
  // https://api.whatsapp.com/send?phone=+34697394223&text=...
  // https://wa.me/34697394223
  try {
    const url = new URL(href);
    const phone =
      url.searchParams.get('phone') ??
      (url.hostname === 'wa.me' ? url.pathname.replace('/', '') : null);
    if (!phone) return undefined;
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('34') && digits.length === 11) return digits.slice(2);
    if (digits.length === 9) return digits;
  } catch {}
  return undefined;
}

export function parseCityFromMapsUrl(src: string): string | undefined {
  // data-src="https://maps.google.com/maps?q=ORIHUELA%20ALICANTE&..."
  try {
    const url = new URL(src);
    const q = decodeURIComponent(url.searchParams.get('q') ?? '');
    const city = q.split(/[\s,+]/)[0]?.toLowerCase().trim();
    return city || undefined;
  } catch {}
  return undefined;
}
