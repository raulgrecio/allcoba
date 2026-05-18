import { describe, expect, it } from 'vitest';
import { mapBluemove, BLUEMOVE_SOURCE } from '#infrastructure/adapters/sources/dating/bluemove/bluemove.mapper.js';
import type { BluemovePayload } from '#infrastructure/adapters/sources/dating/bluemove/bluemove.types.js';
import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const SOURCE_URL = 'https://bluemove.es/madrid/escorts/#49049';

const BASE_PAYLOAD: BluemovePayload = {
  sourceId: '49049',
  sourceUrl: SOURCE_URL,
  title: 'BEATRIZ, Escort en Madrid 678797126',
  nickname: 'Beatriz',
  bio: 'Hola, soy Beatriz, escort independiente en Madrid.',
  phone: '678797126',
  whatsappPhone: '678797126',
  telegram: 'beatriz_escort',
  instagram: 'beatriz_escort_madrid',
  params: {
    age: 27,
    heightCm: 168,
    weightKg: 58,
    hairColor: 'Rubia',
    eyeColor: 'Verdes',
    nationality: 'Española',
    languages: ['Español', 'Inglés'],
    tattoos: false,
    piercings: true,
    city: 'Madrid',
    zone: 'Centro',
    services: ['GFE', 'Masaje erótico'],
  },
  photos: [
    { src: 'https://cdn.bluemove.es/fotos/beatriz_1.jpg' },
    { src: 'https://cdn.bluemove.es/fotos/beatriz_2.jpg' },
  ],
  isVerified: true,
};

describe('mapBluemove — identity', () => {
  it('providerId prefixed with source', async () => {
    const sp = await mapBluemove(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.id).toBe(`${BLUEMOVE_SOURCE}:49049`);
  });

  it('vertical = dating, category = escorts', async () => {
    const sp = await mapBluemove(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.vertical).toBe('dating');
    expect(sp.category).toBe('escorts');
  });

  it('nickname from payload', async () => {
    const sp = await mapBluemove(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.nickname).toBe('Beatriz');
  });

  it('externalRef source = bluemove', async () => {
    const sp = await mapBluemove(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.externalRefs[0]?.source).toBe(BLUEMOVE_SOURCE);
    expect(sp.externalRefs[0]?.sourceId).toBe('49049');
  });
});

describe('mapBluemove — phone + contacts', () => {
  it('maps phone, whatsapp, telegram', async () => {
    const sp = await mapBluemove(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.phoneNumber).toBe('678797126');
    expect(sp.contactOptions).toContain('calls');
    expect(sp.contactOptions).toContain('whatsapp');
    expect(sp.contactOptions).toContain('telegram');
    expect(sp.encodedTelegram).toBe('beatriz_escort');
  });

  it('no phone → undefined', async () => {
    const sp = await mapBluemove(
      { ...BASE_PAYLOAD, phone: undefined, whatsappPhone: undefined, telegram: undefined },
      new FakeTaxonomyResolver(),
      { now: NOW },
    );
    expect(sp.phoneNumber).toBeUndefined();
    expect(sp.contactOptions).toEqual([]);
  });
});

describe('mapBluemove — photos + verified', () => {
  it('maps 2 photos', async () => {
    const sp = await mapBluemove(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.photos).toHaveLength(2);
    expect(sp.photos[0]!.isPrimary).toBe(true);
    expect(sp.statistics!.photoCount).toBe(2);
  });

  it('verified badge = true', async () => {
    const sp = await mapBluemove(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.badges.verified).toBe(true);
    expect(sp.statistics!.isVerified).toBe(true);
  });
});

describe('mapBluemove — geo', () => {
  it('baseCity resolved from city slug', async () => {
    const sp = await mapBluemove(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.baseCity?.id).toBe('city:madrid');
  });

  it('no city → baseCity undefined', async () => {
    const sp = await mapBluemove(
      { ...BASE_PAYLOAD, params: { ...BASE_PAYLOAD.params, city: undefined } },
      new FakeTaxonomyResolver(),
      { now: NOW },
    );
    expect(sp.baseCity).toBeUndefined();
  });
});

describe('mapBluemove — personalDetails', () => {
  it('age + nationality + hair + eye resolved', async () => {
    const sp = await mapBluemove(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.personalDetails.ageYears).toBe(27);
    expect(sp.personalDetails.nationalityId).toBe('nationality:espanola');
    expect(sp.personalDetails.hairId).toBe('hair:rubia');
    expect(sp.personalDetails.eyesId).toBe('eye:verdes');
  });
});

describe('mapBluemove — ScraperMeta', () => {
  it('confidence = medium', async () => {
    const sp = await mapBluemove(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.confidence).toBeGreaterThan(0.5);
  });

  it('timestamps set to now', async () => {
    const sp = await mapBluemove(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.createdAt).toBe(NOW.toISOString());
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });
});
