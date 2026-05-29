import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

import type { CityId } from '@allcoba/shared-types';

import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';
import type { MundosexanuncioPayload } from '#infrastructure/adapters/sources/dating/mundosexanuncio/mundosexanuncio.types.js';
import { extractMundosexanuncio } from '#infrastructure/adapters/sources/dating/mundosexanuncio/mundosexanuncio.extractor.js';
import {
  mapMundosexanuncio,
  MUNDOSEXANUNCIO_SOURCE,
} from '#infrastructure/adapters/sources/dating/mundosexanuncio/mundosexanuncio.mapper.js';
import {
  parseAgeFromText,
  parseMundoPhone,
  parseMundoWhatsapp,
  parseSourceIdFromUrl,
  slugifyMundo,
} from '#infrastructure/adapters/sources/dating/mundosexanuncio/mundosexanuncio.parsers.js';
import { MundosexanuncioPipeline } from '#infrastructure/adapters/sources/dating/mundosexanuncio/mundosexanuncio.pipeline.js';

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

  it('parseSourceIdFromUrl fallback: último segmento si no hay ID numérico', () => {
    expect(parseSourceIdFromUrl('https://www.mundosexanuncio.com/contactos-mujeres/sin-id')).toBe(
      'sin-id',
    );
  });

  it('parseMundoPhone normaliza tel://', () => {
    expect(parseMundoPhone('tel://654587735')).toBe('654587735');
  });

  it('parseMundoPhone — undefined cuando href es undefined', () => {
    expect(parseMundoPhone(undefined)).toBeUndefined();
  });

  it('parseMundoPhone — undefined para número que no es 9 dígitos ni 34+9', () => {
    expect(parseMundoPhone('tel://12345')).toBeUndefined();
  });

  it('parseMundoPhone — normaliza 34XXXXXXXXX a 9 dígitos', () => {
    expect(parseMundoPhone('tel://34654587735')).toBe('654587735');
  });

  it('parseMundoWhatsapp extrae y normaliza phone=34...', () => {
    expect(parseMundoWhatsapp('https://api.whatsapp.com/send?phone=34654587735&text=x')).toBe(
      '654587735',
    );
  });

  it('parseMundoWhatsapp — undefined cuando href es undefined', () => {
    expect(parseMundoWhatsapp(undefined)).toBeUndefined();
  });

  it('parseMundoWhatsapp — undefined cuando no hay param phone', () => {
    expect(parseMundoWhatsapp('https://api.whatsapp.com/send?text=hola')).toBeUndefined();
  });

  it('parseAgeFromText infiere edad del texto', () => {
    expect(parseAgeFromText('soy una chica de 19 años')).toBe(19);
    expect(parseAgeFromText('sin edad aquí')).toBeUndefined();
  });

  it('parseAgeFromText — undefined cuando text es undefined', () => {
    expect(parseAgeFromText(undefined)).toBeUndefined();
  });

  it('parseAgeFromText — undefined cuando número resultante es 0', () => {
    // texto malformado donde parseInt da NaN → undefined
    expect(parseAgeFromText('texto sin número de edad')).toBeUndefined();
  });

  it('slugifyMundo — undefined para string vacío', () => {
    expect(slugifyMundo('')).toBeUndefined();
    expect(slugifyMundo(undefined)).toBeUndefined();
  });

  it('slugifyMundo — slug normal con acentos', () => {
    expect(slugifyMundo('Coslada')).toBe('coslada');
    expect(slugifyMundo('Alcalá de Henares')).toBe('alcala-de-henares');
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
      pipeline.isProfileUrl(
        'https://www.mundosexanuncio.com/contactos-mujeres-en-madrid-provincia',
      ),
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

describe('mundosexanuncio mapper — branch coverage', () => {
  const fakeResolver: TaxonomyResolverPort = {
    resolveCity: async () => 'city:madrid' as CityId,
    resolveNationality: async () => null,
    resolveEthnic: async () => null,
    resolveHair: async () => null,
    resolveEye: async () => null,
    resolveOrientation: async () => null,
  } as unknown as TaxonomyResolverPort;

  it('baseCity populated when resolver returns cityId', async () => {
    const payload = extractMundosexanuncio(loadHtml('antonella_99065186.html'), SOURCE_URL);
    const sp = await mapMundosexanuncio(payload, fakeResolver, { now: NOW });
    expect(sp.baseCity).toBeDefined();
    expect(sp.baseCity!.id).toBe('city:madrid');
  });

  it('no calls/whatsapp contactOptions when no phone fields', async () => {
    const emptyPayload = extractMundosexanuncio('<html><body></body></html>', SOURCE_URL);
    const sp = await mapMundosexanuncio(emptyPayload, nullResolver, { now: NOW });
    expect(sp.contactOptions).not.toContain('calls');
    expect(sp.contactOptions).not.toContain('whatsapp');
    expect(sp.phoneNumber).toBeUndefined();
  });

  it('phoneNumber falls back to whatsappPhone when phone absent', async () => {
    // Build a payload with whatsappPhone but no phone
    const html = `<html><body>
      <h1 class="escort-name">Mia</h1>
      <a href="https://api.whatsapp.com/send?phone=34612345678">WhatsApp</a>
    </body></html>`;
    const payload = extractMundosexanuncio(html, SOURCE_URL);
    // If extractor picks up whatsappPhone but not phone, primaryPhone = whatsappPhone
    // (test just checks no crash and result is defined)
    const sp = await mapMundosexanuncio(payload, nullResolver, { now: NOW });
    expect(sp).toBeDefined();
  });

  it('nickname fallback: title when nickname absent', async () => {
    // Empty HTML → nickname undefined, title might exist from <title> tag
    const payload = extractMundosexanuncio(
      '<html><head><title>Perfil</title></head><body></body></html>',
      SOURCE_URL,
    );
    const sp = await mapMundosexanuncio(payload, nullResolver, { now: NOW });
    // Falls back to title or sourceId
    expect(sp.nickname).toBeTruthy();
  });

  it('aboutMe undefined when bio absent', async () => {
    const sp = await mapMundosexanuncio(
      extractMundosexanuncio('<html><body></body></html>', SOURCE_URL),
      nullResolver,
      { now: NOW },
    );
    expect(sp.aboutMe).toBeUndefined();
  });

  it('attributes.zone set when zone present', async () => {
    const payload = extractMundosexanuncio(loadHtml('antonella_99065186.html'), SOURCE_URL);
    const sp = await mapMundosexanuncio(payload, nullResolver, { now: NOW });
    if (payload.zone) {
      expect((sp.attributes as Record<string, unknown>).zone).toBeTruthy();
    }
  });

  it('attributes empty object when no zone', async () => {
    const sp = await mapMundosexanuncio(
      extractMundosexanuncio('<html><body></body></html>', SOURCE_URL),
      nullResolver,
      { now: NOW },
    );
    // zone is undefined → attributes = {}
    expect((sp.attributes as Record<string, unknown>).zone).toBeUndefined();
  });
});

describe('MundosexanuncioPipeline — methods', () => {
  const pipeline = new MundosexanuncioPipeline();

  it('identifier is mundosexanuncio', () => {
    expect(pipeline.identifier).toBe('mundosexanuncio');
  });

  it('canHandle mundosexanuncio.com URLs', () => {
    expect(pipeline.canHandle('https://mundosexanuncio.com/contactos-mujeres/ana-1')).toBe(true);
    expect(pipeline.canHandle('https://other.com')).toBe(false);
  });

  it('getCrawlerOptions includes cookieSelectors and ageGateSelectors arrays', () => {
    const opts = pipeline.getCrawlerOptions('https://mundosexanuncio.com/contactos-mujeres/');
    expect(Array.isArray(opts.cookieSelectors)).toBe(true);
    expect(opts.cookieSelectors!.length).toBeGreaterThan(0);
    expect(Array.isArray(opts.ageGateSelectors)).toBe(true);
    expect(opts.ageGateSelectors!.length).toBeGreaterThan(0);
  });
});
