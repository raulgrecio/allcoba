import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it, beforeAll } from 'vitest';

import { extractMundosexanuncio } from '#infrastructure/adapters/sources/dating/mundosexanuncio/mundosexanuncio.extractor.js';
import {
  mapMundosexanuncio,
  MUNDOSEXANUNCIO_SOURCE,
} from '#infrastructure/adapters/sources/dating/mundosexanuncio/mundosexanuncio.mapper.js';
import { MundosexanuncioPipeline } from '#infrastructure/adapters/sources/dating/mundosexanuncio/mundosexanuncio.pipeline.js';
import type { MundosexanuncioPayload } from '#infrastructure/adapters/sources/dating/mundosexanuncio/mundosexanuncio.types.js';
import {
  parseSourceIdFromUrl,
  parseMundoPhone,
  parseMundoWhatsapp,
  parseAgeFromText,
} from '#infrastructure/adapters/sources/dating/mundosexanuncio/mundosexanuncio.parsers.js';
import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const loadHtml = (name: string): string =>
  readFileSync(join(HERE, 'fixtures', 'html', name), 'utf8');

const SOURCE_URL =
  'https://www.mundosexanuncio.com/contactos-mujeres/antonella-coslada-video-de-presentacion-99065186';
const NOW = new Date('2026-01-01T00:00:00.000Z');

const nullResolver: TaxonomyResolverPort = {
  resolveCity: async () => null,
  resolveNationality: async () => null,
  resolveEthnic: async () => null,
  resolveHair: async () => null,
  resolveEye: async () => null,
  resolveOrientation: async () => null,
} as unknown as TaxonomyResolverPort;

describe('mundosexanuncio parsers', () => {
  it('parseSourceIdFromUrl extrae el id numérico final', () => {
    expect(parseSourceIdFromUrl(SOURCE_URL)).toBe('99065186');
  });
  it('parseMundoPhone normaliza tel://', () => {
    expect(parseMundoPhone('tel://654587735')).toBe('654587735');
  });
  it('parseMundoWhatsapp extrae y normaliza phone=34...', () => {
    expect(parseMundoWhatsapp('https://api.whatsapp.com/send?phone=34654587735&text=x')).toBe(
      '654587735',
    );
  });
  it('parseAgeFromText infiere edad del texto', () => {
    expect(parseAgeFromText('soy una chica de 19 años')).toBe(19);
    expect(parseAgeFromText('sin edad aquí')).toBeUndefined();
  });
});

describe('extractMundosexanuncio — fixture antonella_99065186', () => {
  let payload: MundosexanuncioPayload;

  beforeAll(() => {
    payload = extractMundosexanuncio(loadHtml('antonella_99065186.html'), SOURCE_URL);
  });

  it('sourceId = 99065186', () => expect(payload.sourceId).toBe('99065186'));
  it('nickname = Antonella', () => expect(payload.nickname).toBe('Antonella'));
  it('bio extraído', () => expect(payload.bio).toContain('Antonella'));
  it('phone', () => expect(payload.phone).toBe('654587735'));
  it('whatsappPhone', () => expect(payload.whatsappPhone).toBe('654587735'));
  it('city = Madrid', () => expect(payload.city).toBe('Madrid'));
  it('zone extraído', () => expect(payload.zone).toBeTruthy());
  it('age = 19 (del bio)', () => expect(payload.age).toBe(19));
  it('photos extraídas', () => expect(payload.photos.length).toBeGreaterThan(0));
});

describe('extractMundosexanuncio — HTML mínimo', () => {
  it('maneja body vacío sin romper', () => {
    const p = extractMundosexanuncio('<html><body></body></html>', SOURCE_URL);
    expect(p.sourceId).toBe('99065186');
    expect(p.nickname).toBeUndefined();
    expect(p.photos).toHaveLength(0);
  });
});

describe('MundosexanuncioPipeline', () => {
  const pipeline = new MundosexanuncioPipeline();

  it('canHandle reconoce el dominio', () => {
    expect(pipeline.canHandle(SOURCE_URL)).toBe(true);
    expect(pipeline.canHandle('https://otra.com/x')).toBe(false);
  });
  it('isProfileUrl acepta /contactos-mujeres/{slug}-{id}', () => {
    expect(pipeline.isProfileUrl(SOURCE_URL)).toBe(true);
  });
  it('isProfileUrl rechaza el listado', () => {
    expect(
      pipeline.isProfileUrl('https://www.mundosexanuncio.com/contactos-mujeres-en-madrid-provincia'),
    ).toBe(false);
  });
});

describe('mundosexanuncio pipeline — HTML → ScrapedProvider', () => {
  it('extract + map produce un ScrapedProvider válido', async () => {
    const payload = extractMundosexanuncio(loadHtml('antonella_99065186.html'), SOURCE_URL);
    const sp = await mapMundosexanuncio(payload, nullResolver, { now: NOW });

    expect(sp.id).toContain(MUNDOSEXANUNCIO_SOURCE);
    expect(sp.vertical).toBe('dating');
    expect(sp.nickname).toBe('Antonella');
    expect(sp.phoneNumber).toBe('654587735');
    expect(sp.contactOptions).toContain('calls');
    expect(sp.contactOptions).toContain('whatsapp');
    expect(sp.personalDetails.ageYears).toBe(19);
    expect(sp.photos.length).toBeGreaterThan(0);
    expect(sp.aboutMe?.original).toBeTruthy();
    expect(sp.externalRefs[0]?.source).toBe(MUNDOSEXANUNCIO_SOURCE);
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });
});
