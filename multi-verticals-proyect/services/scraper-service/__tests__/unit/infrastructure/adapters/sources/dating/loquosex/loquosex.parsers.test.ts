import { describe, expect, it } from 'vitest';

import {
  extractLoquosexWhatsappPhone,
  normalizeLoquosexPhone,
  parseLoquosexAge,
  parseLoquosexMeetingPlaces,
  parseLoquosexMinPrice,
  parseNicknameFromTitle,
  parseSourceIdFromUrl,
  slugifyLoquosex,
} from '#infrastructure/adapters/sources/dating/loquosex/loquosex.parsers.js';

describe('parseNicknameFromTitle', () => {
  it('strips phone and comma from title', () => {
    expect(parseNicknameFromTitle('Maria, Escort de lujo 600777888')).toBe('Maria');
  });

  it('strips trailing phone, no comma', () => {
    expect(parseNicknameFromTitle('JOVEN Y GUAPA 677684329, HAGO TODO LOS SERVICIOS')).toBe(
      'JOVEN Y GUAPA',
    );
  });

  it('returns trimmed title when no phone or comma', () => {
    expect(parseNicknameFromTitle('Sofia')).toBe('Sofia');
  });

  it('returns empty string for falsy input', () => {
    expect(parseNicknameFromTitle(null)).toBe('');
    expect(parseNicknameFromTitle(undefined)).toBe('');
    expect(parseNicknameFromTitle('')).toBe('');
  });
});

describe('parseLoquosexAge', () => {
  it('parses "25 años" → 25', () => {
    expect(parseLoquosexAge('25 años')).toBe(25);
  });

  it('parses bare digit string', () => {
    expect(parseLoquosexAge('30')).toBe(30);
  });

  it('returns undefined for falsy input', () => {
    expect(parseLoquosexAge(null)).toBeUndefined();
    expect(parseLoquosexAge(undefined)).toBeUndefined();
    expect(parseLoquosexAge('')).toBeUndefined();
  });

  it('returns undefined when no digits', () => {
    expect(parseLoquosexAge('no digits')).toBeUndefined();
  });
});

describe('parseLoquosexMinPrice', () => {
  it('parses "50 €" → 50', () => {
    expect(parseLoquosexMinPrice('50 €')).toBe(50);
  });

  it('parses "100 €" → 100', () => {
    expect(parseLoquosexMinPrice('100 €')).toBe(100);
  });

  it('returns undefined for falsy input', () => {
    expect(parseLoquosexMinPrice(null)).toBeUndefined();
    expect(parseLoquosexMinPrice('')).toBeUndefined();
  });
});

describe('slugifyLoquosex', () => {
  it('lowercases and removes accents', () => {
    expect(slugifyLoquosex('Venezolana')).toBe('venezolana');
    expect(slugifyLoquosex('Española')).toBe('espanola');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugifyLoquosex('Nueva York')).toBe('nueva-york');
  });

  it('returns undefined for falsy', () => {
    expect(slugifyLoquosex(null)).toBeUndefined();
    expect(slugifyLoquosex('')).toBeUndefined();
  });
});

describe('parseSourceIdFromUrl', () => {
  it('extracts 9-digit phone from URL slug', () => {
    expect(parseSourceIdFromUrl('/ven-a-conocerme-677684329.html/')).toBe('677684329');
    expect(parseSourceIdFromUrl('https://loquosex.com/maria-escort-600777888.html')).toBe(
      '600777888',
    );
  });

  it('falls back to last path segment without extension', () => {
    expect(parseSourceIdFromUrl('/some-slug-no-digits')).toBe('some-slug-no-digits');
  });
});

describe('normalizeLoquosexPhone', () => {
  it('strips spaces', () => {
    expect(normalizeLoquosexPhone('677 684 329')).toBe('677684329');
  });

  it('strips non-digit chars', () => {
    expect(normalizeLoquosexPhone('677-684-329')).toBe('677684329');
  });

  it('returns undefined for falsy', () => {
    expect(normalizeLoquosexPhone(null)).toBeUndefined();
    expect(normalizeLoquosexPhone('')).toBeUndefined();
  });
});

describe('extractLoquosexWhatsappPhone', () => {
  it('extracts from api.whatsapp.com phone param', () => {
    expect(
      extractLoquosexWhatsappPhone('https://api.whatsapp.com/send?phone=34677684329&text=Hola'),
    ).toBe('+34677684329');
  });

  it('extracts from wa.me URL', () => {
    expect(extractLoquosexWhatsappPhone('https://wa.me/34677684329')).toBe('+34677684329');
  });

  it('returns undefined for falsy', () => {
    expect(extractLoquosexWhatsappPhone(null)).toBeUndefined();
    expect(extractLoquosexWhatsappPhone('')).toBeUndefined();
  });

  it('returns undefined for unrecognised href', () => {
    expect(extractLoquosexWhatsappPhone('https://example.com')).toBeUndefined();
  });
});

describe('parseLoquosexMeetingPlaces', () => {
  it('detects incall from "piso"', () => {
    const r = parseLoquosexMeetingPlaces('Tengo piso privado');
    expect(r.incall).toBe(true);
    expect(r.outcall).toBe(false);
  });

  it('detects outcall from "hotel"', () => {
    const r = parseLoquosexMeetingPlaces('Salgo a hoteles y domicilios');
    expect(r.incall).toBe(false);
    expect(r.outcall).toBe(true);
  });

  it('detects both from mixed bio', () => {
    const r = parseLoquosexMeetingPlaces('Tengo piso. También hago salidas a hoteles.');
    expect(r.incall).toBe(true);
    expect(r.outcall).toBe(true);
  });

  it('returns false/false for empty bio', () => {
    expect(parseLoquosexMeetingPlaces(null)).toEqual({ incall: false, outcall: false });
    expect(parseLoquosexMeetingPlaces('')).toEqual({ incall: false, outcall: false });
  });
});
