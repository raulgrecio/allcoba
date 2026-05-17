/**
 * Parsers puros de URLs de redes sociales.
 * Reciben el href ya seleccionado y devuelven el handle normalizado.
 * Sin selectores — eso es responsabilidad de cada adapter.
 */

export function parseWhatsappHref(href: string): string | undefined {
  // wa.me/34612345678 o wa.me/+34612345678
  const waMe = href.match(/wa\.me\/\+?(\d+)/);
  if (waMe) return `+${waMe[1]!}`;
  // api/web.whatsapp.com/send?phone=34612345678
  const phone = href.match(/[?&]phone=(\d+)/);
  if (phone) return `+${phone[1]!}`;
  return undefined;
}

export function parseTelegramHref(href: string): string | undefined {
  // t.me/+34612345678 o t.me/34612345678 (sin +)
  const phoneMatch = href.match(/(?:t\.me|telegram\.me)\/\+?(\d{9,})/);
  if (phoneMatch) return `+${phoneMatch[1]!}`;
  // t.me/username o t.me/@username — skip reserved paths (sharing widgets, etc.)
  const usernameMatch = href.match(/(?:t\.me|telegram\.me)\/@?([^/?&#\d][^/?&#]*)/);
  if (!usernameMatch) return undefined;
  const username = usernameMatch[1]!;
  if (/^(?:share|joinchat|addstickers|socks|proxy|bg|iv)$/i.test(username)) return undefined;
  return `@${username}`;
}

export function parseInstagramHref(href: string): string | undefined {
  const m = href.match(/instagram\.com\/@?([^/?&#]+)/);
  return m ? `@${m[1]!}` : undefined;
}

export function parseTiktokHref(href: string): string | undefined {
  const m = href.match(/tiktok\.com\/@?([^/?&#]+)/);
  return m ? `@${m[1]!}` : undefined;
}

export function parseTwitterHref(href: string): string | undefined {
  // twitter.com/username  x.com/username
  const m = href.match(/(?:twitter|x)\.com\/@?([^/?&#]+)/);
  // Skip reserved paths
  if (!m || /^(?:i|home|search|explore|notifications|messages|settings|intent|share|hashtag|login|signup|logout|privacy|tos|help|about)$/i.test(m[1]!)) {
    return undefined;
  }
  return `@${m[1]!}`;
}

export function parseOnlyfansHref(href: string): string | undefined {
  const m = href.match(/onlyfans\.com\/@?([^/?&#]+)/);
  if (!m || m[1] === 'action') return undefined;
  return m[1]!;
}

export function parseFanslyHref(href: string): string | undefined {
  const m = href.match(/fansly\.com\/@?([^/?&#]+)/);
  return m ? m[1]! : undefined;
}
