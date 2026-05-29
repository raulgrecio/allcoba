import type { Madrid69Payload } from './madrid69.types.js';

// URL formats:
//   Old: /citas-chicas-{city}-{id}-{name...}-{phone}
//   New: /citas/{city}/{slug}

export function parseSourceIdFromUrl(url: string): string {
  const { pathname } = new URL(url);
  const segments = pathname.split('/').filter(Boolean);

  // New format: /citas/{city}/{slug}
  if (segments[0] === 'citas' && segments.length >= 3) {
    const slug = segments[segments.length - 1]!;
    const m = slug.match(/-(\d{4,6})-/) ?? slug.match(/-(\d{4,6})$/);
    if (m) return m[1]!;
    return slug;
  }

  // Old format: /citas-chicas-{city}-{id}-...
  const slug = segments[0] ?? '';
  const m = slug.match(/^citas-chicas-[a-z]+-(\d+)-/);
  if (m) return m[1]!;

  // Fallback: first multi-digit block
  const fb = slug.match(/(\d{4,})/);
  return fb?.[1] ?? slug;
}

export function parseCityFromUrl(url: string): string | undefined {
  const { pathname } = new URL(url);
  const segments = pathname.split('/').filter(Boolean);

  // New format: /citas/{city}/{slug}
  if (segments[0] === 'citas' && segments.length >= 3) {
    return segments[1];
  }

  // Old format: /citas-chicas-{city}-{id}-...
  const slug = segments[0] ?? '';
  const m = slug.match(/^citas-chicas-([a-z]+)-\d+/);
  return m?.[1];
}

export function parseNicknameFromTitle(title: string): string | undefined {
  if (!title) return undefined;
  const raw = title.split(/[,\-|]/)[0]?.trim() ?? '';
  return raw || undefined;
}

export function parseMadrid69PhoneFromTitle(title: string): string | undefined {
  const m = title.match(/tel[:\s]+(\d{9})/i);
  return m?.[1];
}

export function parseMadrid69Phone(phone?: string): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('34') && digits.length === 11) return digits.slice(2);
  if (digits.length === 9) return digits;
  return undefined;
}

export function slugifyMadrid69(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function parseMadrid69ApiProfile(
  raw: unknown,
): Partial<Omit<Madrid69Payload, 'sourceId' | 'sourceUrl'>> {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;

  const profile: Record<string, unknown> =
    obj['data'] && typeof obj['data'] === 'object' ? (obj['data'] as Record<string, unknown>) : obj;

  if (!profile['nombre'] && !profile['id']) return {};

  const photos: Array<{ src: string }> = [];
  const fotos = profile['fotos'];
  if (Array.isArray(fotos)) {
    for (const f of fotos) {
      const foto = f as Record<string, unknown>;
      if (typeof foto['ruta'] === 'string') {
        photos.push({ src: `https://api.madrid69.com/storage/${foto['ruta']}` });
      }
    }
  }

  const services: string[] = [];
  const servicios = profile['servicios'];
  if (Array.isArray(servicios)) {
    for (const s of servicios) {
      const svc = s as Record<string, unknown>;
      if (typeof svc['nombre'] === 'string') services.push(svc['nombre']);
    }
  }

  const languages: string[] = [];
  const idiomas = profile['idiomas'];
  if (Array.isArray(idiomas)) {
    for (const l of idiomas) {
      if (typeof l === 'string') languages.push(l);
    }
  }

  return {
    nickname: typeof profile['nombre'] === 'string' ? profile['nombre'] : undefined,
    bio:
      typeof profile['descripcion'] === 'string' ? profile['descripcion'] || undefined : undefined,
    phone: parseMadrid69Phone(
      typeof profile['telefono'] === 'string' ? profile['telefono'] : undefined,
    ),
    whatsappPhone: parseMadrid69Phone(
      typeof profile['whatsapp'] === 'string' ? profile['whatsapp'] : undefined,
    ),
    photos: photos.length ? photos : undefined,
    city: typeof profile['ciudad'] === 'string' ? profile['ciudad'] : undefined,
    age: typeof profile['edad'] === 'number' ? profile['edad'] : undefined,
    heightCm: typeof profile['altura'] === 'number' ? profile['altura'] : undefined,
    weightKg: typeof profile['peso'] === 'number' ? profile['peso'] : undefined,
    nationality: typeof profile['nacionalidad'] === 'string' ? profile['nacionalidad'] : undefined,
    languages: languages.length ? languages : undefined,
    isVerified: typeof profile['verificado'] === 'boolean' ? profile['verificado'] : undefined,
    isVip: typeof profile['vip'] === 'boolean' ? profile['vip'] : undefined,
    services: services.length ? services : undefined,
  };
}
