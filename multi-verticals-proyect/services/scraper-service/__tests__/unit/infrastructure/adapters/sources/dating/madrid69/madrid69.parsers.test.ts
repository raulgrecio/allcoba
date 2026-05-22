import { describe, expect, it } from 'vitest';

import {
  parseCityFromUrl,
  parseMadrid69ApiProfile,
  parseMadrid69Phone,
  parseMadrid69PhoneFromTitle,
  parseNicknameFromTitle,
  parseSourceIdFromUrl,
  slugifyMadrid69,
} from '#infrastructure/adapters/sources/dating/madrid69/madrid69.parsers.js';

describe('parseSourceIdFromUrl', () => {
  it.each([
    ['https://www.madrid69.com/citas-chicas-madrid-44064-thalia-pura-ternura-644417235', '44064'],
    ['https://madrid69.com/citas/madrid/carla-12345', '12345'],
    ['https://madrid69.com/citas/barcelona/sofia-99999-644111222', '99999'],
  ])('%s → %s', (url, expected) => {
    expect(parseSourceIdFromUrl(url)).toBe(expected);
  });
});

describe('parseCityFromUrl', () => {
  it.each([
    ['https://www.madrid69.com/citas-chicas-madrid-44064-thalia-pura-ternura-644417235', 'madrid'],
    ['https://www.madrid69.com/citas-chicas-barcelona-99999-sofia-611000111', 'barcelona'],
    ['https://madrid69.com/citas/madrid/carla-12345', 'madrid'],
    ['https://madrid69.com/citas/sevilla/ana-55555', 'sevilla'],
  ])('%s → %s', (url, expected) => {
    expect(parseCityFromUrl(url)).toBe(expected);
  });
});

describe('parseNicknameFromTitle', () => {
  it('extracts first word before comma', () =>
    expect(parseNicknameFromTitle('Kheila, pura ternura - tel: 644417235 | ...')).toBe('Kheila'));

  it('extracts first word before dash', () =>
    expect(parseNicknameFromTitle('Sofia - escort Madrid')).toBe('Sofia'));

  it('extracts first word before pipe', () =>
    expect(parseNicknameFromTitle('Ana | Escorts Madrid')).toBe('Ana'));

  it('returns undefined for empty string', () =>
    expect(parseNicknameFromTitle('')).toBeUndefined());
});

describe('parseMadrid69PhoneFromTitle', () => {
  it('extracts 9-digit phone after "tel:"', () =>
    expect(parseMadrid69PhoneFromTitle('Kheila, pura ternura - tel: 644417235 | ...')).toBe(
      '644417235',
    ));

  it('handles "Tel:" with capital', () =>
    expect(parseMadrid69PhoneFromTitle('Sofia - Tel:611223344')).toBe('611223344'));

  it('returns undefined when no phone', () =>
    expect(parseMadrid69PhoneFromTitle('Sofia - escort Madrid')).toBeUndefined());
});

describe('parseMadrid69Phone', () => {
  it.each([
    ['644417235', '644417235'],
    ['+34644417235', '644417235'],
    ['34644417235', '644417235'],
    [undefined, undefined],
    ['123', undefined],
    ['1234567890', undefined],
  ])('%s → %s', (input, expected) => {
    expect(parseMadrid69Phone(input)).toBe(expected);
  });
});

describe('slugifyMadrid69', () => {
  it.each([
    ['Madrid', 'madrid'],
    ['Colombia', 'colombia'],
    ['São Paulo', 'sao-paulo'],
    ['República Dominicana', 'republica-dominicana'],
  ])('%s → %s', (input, expected) => {
    expect(slugifyMadrid69(input)).toBe(expected);
  });
});

describe('parseMadrid69ApiProfile', () => {
  const fullProfile = {
    data: {
      id: 44064,
      nombre: 'Kheila',
      edad: 25,
      descripcion: 'Una chica auténtica.',
      ciudad: 'Madrid',
      telefono: '644417235',
      whatsapp: '+34644417235',
      verificado: false,
      vip: false,
      nacionalidad: 'Colombia',
      altura: 168,
      peso: 58,
      idiomas: ['Español', 'Inglés'],
      fotos: [{ ruta: 'images/abc/foto1.jpg' }, { ruta: 'images/abc/foto2.jpg' }],
      servicios: [{ nombre: 'Besos' }, { nombre: 'Novia' }],
    },
  };

  it('parses full API response wrapped in data', () => {
    const result = parseMadrid69ApiProfile(fullProfile);
    expect(result.nickname).toBe('Kheila');
    expect(result.age).toBe(25);
    expect(result.bio).toBe('Una chica auténtica.');
    expect(result.city).toBe('Madrid');
    expect(result.phone).toBe('644417235');
    expect(result.whatsappPhone).toBe('644417235');
    expect(result.isVerified).toBe(false);
    expect(result.isVip).toBe(false);
    expect(result.nationality).toBe('Colombia');
    expect(result.heightCm).toBe(168);
    expect(result.weightKg).toBe(58);
    expect(result.languages).toEqual(['Español', 'Inglés']);
    expect(result.services).toEqual(['Besos', 'Novia']);
    expect(result.photos).toHaveLength(2);
    expect(result.photos![0]!.src).toBe('https://api.madrid69.com/storage/images/abc/foto1.jpg');
  });

  it('parses direct profile (no .data wrapper)', () => {
    const result = parseMadrid69ApiProfile(fullProfile.data);
    expect(result.nickname).toBe('Kheila');
    expect(result.age).toBe(25);
  });

  it('returns empty for invalid input', () => {
    expect(parseMadrid69ApiProfile(null)).toEqual({});
    expect(parseMadrid69ApiProfile('string')).toEqual({});
    expect(parseMadrid69ApiProfile({})).toEqual({});
  });

  it('ignores profile without nombre or id', () => {
    expect(parseMadrid69ApiProfile({ data: { descripcion: 'only bio' } })).toEqual({});
  });

  it('handles missing photos gracefully', () => {
    const result = parseMadrid69ApiProfile({ id: 1, nombre: 'Ana' });
    expect(result.photos).toBeUndefined();
  });

  it('handles empty descripcion as undefined', () => {
    const result = parseMadrid69ApiProfile({ id: 1, nombre: 'Ana', descripcion: '' });
    expect(result.bio).toBeUndefined();
  });
});
