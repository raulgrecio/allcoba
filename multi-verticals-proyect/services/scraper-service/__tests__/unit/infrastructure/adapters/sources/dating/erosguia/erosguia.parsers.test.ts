import { describe, it, expect } from 'vitest';

import {
  parseErosguiaAge,
  parseErosguiaHeightCm,
  slugifyErosguia,
  parseErosguiaPhoneFromTitle,
  extractErosguiaWhatsappPhone,
  parseErosguiaLanguages,
} from '#infrastructure/adapters/sources/dating/erosguia/erosguia.parsers.js';

describe('parseErosguiaAge', () => {
  it('"22 años" → 22', () => expect(parseErosguiaAge('22 años')).toBe(22));
  it('"30 años" → 30', () => expect(parseErosguiaAge('30 años')).toBe(30));
  it('"18 años" → 18', () => expect(parseErosguiaAge('18 años')).toBe(18));
  it('undefined → undefined', () => expect(parseErosguiaAge(undefined)).toBeUndefined());
  it('null → undefined', () => expect(parseErosguiaAge(null)).toBeUndefined());
  it('non-numeric → undefined', () => expect(parseErosguiaAge('desconocida')).toBeUndefined());
});

describe('parseErosguiaHeightCm', () => {
  it('"160 cm." → 160', () => expect(parseErosguiaHeightCm('160 cm.')).toBe(160));
  it('"172 cm." → 172', () => expect(parseErosguiaHeightCm('172 cm.')).toBe(172));
  it('"165 cm" → 165 (no dot)', () => expect(parseErosguiaHeightCm('165 cm')).toBe(165));
  it('bare "170" → 170', () => expect(parseErosguiaHeightCm('170')).toBe(170));
  it('undefined → undefined', () => expect(parseErosguiaHeightCm(undefined)).toBeUndefined());
  it('null → undefined', () => expect(parseErosguiaHeightCm(null)).toBeUndefined());
});

describe('slugifyErosguia', () => {
  it('"Colombiana" → "colombiana"', () => expect(slugifyErosguia('Colombiana')).toBe('colombiana'));
  it('"Española" → "espanola" (NFD strip)', () =>
    expect(slugifyErosguia('Española')).toBe('espanola'));
  it('"Madrid" → "madrid"', () => expect(slugifyErosguia('Madrid')).toBe('madrid'));
  it('"Venezolana" → "venezolana"', () =>
    expect(slugifyErosguia('Venezolana')).toBe('venezolana'));
  it('undefined → undefined', () => expect(slugifyErosguia(undefined)).toBeUndefined());
  it('null → undefined', () => expect(slugifyErosguia(null)).toBeUndefined());
  it('empty string → undefined', () => expect(slugifyErosguia('')).toBeUndefined());
});

describe('parseErosguiaPhoneFromTitle', () => {
  it('extracts phone from title pattern', () =>
    expect(
      parseErosguiaPhoneFromTitle('Anny, Escort en Madrid - 614 246 033 - EROSGUIA'),
    ).toBe('614246033'));

  it('strips spaces from matched phone', () =>
    expect(
      parseErosguiaPhoneFromTitle('Barby, Escort en Barcelona - 664 708 586 - EROSGUIA'),
    ).toBe('664708586'));

  it('no phone in title → undefined', () =>
    expect(parseErosguiaPhoneFromTitle('Escort en Madrid - EROSGUIA')).toBeUndefined());

  it('undefined → undefined', () =>
    expect(parseErosguiaPhoneFromTitle(undefined)).toBeUndefined());

  it('null → undefined', () => expect(parseErosguiaPhoneFromTitle(null)).toBeUndefined());
});

describe('extractErosguiaWhatsappPhone', () => {
  it('extracts E.164 from wa.me href', () =>
    expect(
      extractErosguiaWhatsappPhone(
        'https://wa.me/34643435399?text=Hola+Anny',
      ),
    ).toBe('+34643435399'));

  it('different number from call phone', () =>
    expect(extractErosguiaWhatsappPhone('https://wa.me/34664708586?text=Hola')).toBe(
      '+34664708586',
    ));

  it('undefined → undefined', () =>
    expect(extractErosguiaWhatsappPhone(undefined)).toBeUndefined());

  it('null → undefined', () => expect(extractErosguiaWhatsappPhone(null)).toBeUndefined());

  it('non-wa.me href → undefined', () =>
    expect(extractErosguiaWhatsappPhone('https://t.me/+34643435399')).toBeUndefined());
});

describe('parseErosguiaLanguages', () => {
  it('"Español, Inglés" → two langs', () =>
    expect(parseErosguiaLanguages('Español, Inglés')).toEqual(['Español', 'Inglés']));

  it('single language', () =>
    expect(parseErosguiaLanguages('Español')).toEqual(['Español']));

  it('trims spaces', () =>
    expect(parseErosguiaLanguages('Español ,  Inglés ')).toEqual(['Español', 'Inglés']));

  it('empty string → []', () => expect(parseErosguiaLanguages('')).toEqual([]));

  it('undefined → []', () => expect(parseErosguiaLanguages(undefined)).toEqual([]));

  it('null → []', () => expect(parseErosguiaLanguages(null)).toEqual([]));
});
