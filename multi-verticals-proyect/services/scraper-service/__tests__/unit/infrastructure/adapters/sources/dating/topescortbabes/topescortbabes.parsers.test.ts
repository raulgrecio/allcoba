import { describe, expect, it } from 'vitest';

import {
  extractTaxonomySlug,
  labelToPriceSlot,
  normalizeContactOption,
  normalizeGender,
  parseFirstInt,
  parseHeightCm,
  parseHumanDateEs,
  parseMeetingWith,
  parseRelativeTimeEs,
  parseWeightKg,
  stripHtml,
} from '#infrastructure/adapters/sources/dating/topescortbabes/topescortbabes.parsers.js';

describe('stripHtml', () => {
  it('removes tags and decodes common entities', () => {
    expect(stripHtml('<a href="x">venezolana</a>')).toBe('venezolana');
    expect(stripHtml('Hello&nbsp;World &amp; co.')).toBe('Hello World & co.');
  });

  it('returns undefined for nullish input', () => {
    expect(stripHtml(undefined)).toBeUndefined();
    expect(stripHtml('')).toBeUndefined();
  });
});

describe('extractTaxonomySlug', () => {
  it('strips the -<taxonomy> suffix from the SEO href', () => {
    const html =
      '<a href="https://topescortbabes.com/es/madrid/escorts/venezuelan-nationality" title="...">venezolana</a>';
    expect(extractTaxonomySlug(html, 'nationality')).toBe('venezuelan');
  });

  it('handles multi-word slugs', () => {
    const html =
      '<a href="https://topescortbabes.com/es/madrid/escorts/middle-eastern-ethnic">arabe</a>';
    expect(extractTaxonomySlug(html, 'ethnic')).toBe('middle-eastern');
  });

  it('returns undefined when there is no href', () => {
    expect(extractTaxonomySlug('plain text', 'hair')).toBeUndefined();
    expect(extractTaxonomySlug(undefined, 'hair')).toBeUndefined();
  });
});

describe('parseFirstInt / parseHeightCm / parseWeightKg', () => {
  it('extracts the first integer', () => {
    expect(parseFirstInt('165cm / 5\'5"')).toBe(165);
    expect(parseFirstInt('54kg / 119lbs')).toBe(54);
    expect(parseFirstInt('abc')).toBeUndefined();
    expect(parseFirstInt(undefined)).toBeUndefined();
  });

  it('parses HTML-wrapped height/weight', () => {
    expect(parseHeightCm('<a>165cm / 5\'5"</a>')).toBe(165);
    expect(parseWeightKg('<a>54kg</a>')).toBe(54);
  });
});

describe('parseHumanDateEs', () => {
  it('parses "DD <month>, YYYY" into ISO-8601', () => {
    expect(parseHumanDateEs('Actualizado el 01 septiembre, 2025')).toBe(
      '2025-09-01T00:00:00.000Z',
    );
    expect(parseHumanDateEs('15 enero, 2024')).toBe('2024-01-15T00:00:00.000Z');
  });

  it('returns undefined for unrecognized patterns', () => {
    expect(parseHumanDateEs(undefined)).toBeUndefined();
    expect(parseHumanDateEs('yesterday')).toBeUndefined();
  });
});

describe('parseRelativeTimeEs', () => {
  const NOW = new Date('2026-05-17T12:00:00.000Z');

  it('subtracts days', () => {
    const r = parseRelativeTimeEs('activo hace 4 días', NOW);
    expect(r).toBe('2026-05-13T12:00:00.000Z');
  });

  it('subtracts months (30 days each, approx)', () => {
    const r = parseRelativeTimeEs('hace 2 meses', NOW);
    expect(r).toBe('2026-03-18T12:00:00.000Z');
  });

  it('subtracts years', () => {
    const r = parseRelativeTimeEs('hace 1 año', NOW);
    expect(r).toBe('2025-05-17T12:00:00.000Z');
  });

  it('returns undefined for unknown unit', () => {
    expect(parseRelativeTimeEs('hace 4 lustros', NOW)).toBeUndefined();
  });
});

describe('normalizeContactOption', () => {
  it.each([
    ['Calls', 'calls'],
    ['SMS', 'sms'],
    ['Whatsapp', 'whatsapp'],
    ['WhatsApp', 'whatsapp'],
    ['Telegram', 'telegram'],
  ])('maps %s → %s', (input, expected) => {
    expect(normalizeContactOption(input)).toBe(expected);
  });

  it('returns null for unknown', () => {
    expect(normalizeContactOption('Email')).toBeNull();
  });
});

describe('labelToPriceSlot', () => {
  it.each([
    ['1 hora', 'h1'],
    ['2 horas', 'h2'],
    ['3 horas', 'h3'],
    ['12 horas', 'h12'],
    ['24 horas', 'h24'],
  ])('maps %s → %s', (input, expected) => {
    expect(labelToPriceSlot(input)).toBe(expected);
  });

  it('falls back to custom', () => {
    expect(labelToPriceSlot('overnight')).toBe('custom');
  });
});

describe('parseMeetingWith', () => {
  it('extracts every keyword present', () => {
    expect(parseMeetingWith('encuentro con un hombre y una pareja').sort()).toEqual([
      'couple',
      'man',
    ]);
    expect(parseMeetingWith('mujer')).toEqual(['woman']);
    expect(parseMeetingWith('grupo')).toEqual(['group']);
  });

  it('returns [] when no keywords match', () => {
    expect(parseMeetingWith('???')).toEqual([]);
    expect(parseMeetingWith(undefined)).toEqual([]);
  });
});

describe('normalizeGender', () => {
  it('maps Schema.org gender', () => {
    expect(normalizeGender('Female')).toBe('female');
    expect(normalizeGender('Male')).toBe('male');
  });

  it('overrides with trans when badge is set', () => {
    expect(normalizeGender('Female', { trans: true })).toBe('trans');
  });

  it('returns undefined when no signal', () => {
    expect(normalizeGender(undefined)).toBeUndefined();
  });
});
