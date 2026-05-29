import { describe, expect, it } from 'vitest';

import type { CitapasionPayload } from '#infrastructure/adapters/sources/dating/citapasion/citapasion.types.js';
import {
  CITAPASION_SOURCE,
  mapCitapasion,
} from '#infrastructure/adapters/sources/dating/citapasion/citapasion.mapper.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const SOURCE_URL = 'https://citapasion.com/escorts/17533';

const BASE_PAYLOAD: CitapasionPayload = {
  sourceId: '17533',
  sourceUrl: SOURCE_URL,
  title: 'Sofia escort independiente en Madrid',
  nickname: 'Sofia',
  bio: 'Hola, soy Sofia, escort independiente en Madrid.',
  phone: '644556677',
  whatsappPhone: '644556677',
  params: {
    age: 28,
    heightCm: 165,
    weightKg: 55,
    hairColor: 'Morena',
    eyeColor: 'Marrones',
    nationality: 'Colombiana',
    ethnicity: 'Latina',
    city: 'Madrid',
    zone: 'Centro',
    languages: ['Español', 'Inglés'],
    tattoos: false,
    piercings: true,
    smoker: false,
  },
  photos: [
    { src: 'https://cdn.citapasion.com/fotos/sofia_1_full.jpg' },
    { src: 'https://cdn.citapasion.com/fotos/sofia_2_full.jpg' },
  ],
  siteRating: { score: 4.5, count: 12 },
};

describe('mapCitapasion — identity', () => {
  it('providerId prefixed with source', async () => {
    const sp = await mapCitapasion(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.id).toBe(`${CITAPASION_SOURCE}:17533`);
  });

  it('vertical = dating, category = escorts', async () => {
    const sp = await mapCitapasion(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.vertical).toBe('dating');
    expect(sp.category).toBe('escorts');
  });

  it('nickname from payload', async () => {
    const sp = await mapCitapasion(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.nickname).toBe('Sofia');
  });

  it('externalRef source = citapasion', async () => {
    const sp = await mapCitapasion(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.externalRefs[0]?.source).toBe(CITAPASION_SOURCE);
    expect(sp.externalRefs[0]?.sourceId).toBe('17533');
  });
});

describe('mapCitapasion — phone', () => {
  it('maps phone and contactOptions', async () => {
    const sp = await mapCitapasion(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.phoneNumber).toBe('644556677');
    expect(sp.contactOptions).toContain('calls');
    expect(sp.contactOptions).toContain('whatsapp');
  });

  it('no phone → undefined phoneNumber', async () => {
    const sp = await mapCitapasion(
      { ...BASE_PAYLOAD, phone: undefined, whatsappPhone: undefined },
      new FakeTaxonomyResolver(),
      { now: NOW },
    );
    expect(sp.phoneNumber).toBeUndefined();
    expect(sp.contactOptions).toEqual([]);
  });
});

describe('mapCitapasion — photos', () => {
  it('maps 2 photos, first isPrimary', async () => {
    const sp = await mapCitapasion(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.photos).toHaveLength(2);
    expect(sp.photos[0]!.isPrimary).toBe(true);
    expect(sp.photos[1]!.isPrimary).toBe(false);
    expect(sp.statistics!.photoCount).toBe(2);
  });
});

describe('mapCitapasion — geo', () => {
  it('baseCity resolved from city slug', async () => {
    const sp = await mapCitapasion(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.baseCity?.id).toBe('city:madrid');
  });

  it('no city → baseCity undefined', async () => {
    const sp = await mapCitapasion(
      { ...BASE_PAYLOAD, params: { ...BASE_PAYLOAD.params, city: undefined } },
      new FakeTaxonomyResolver(),
      { now: NOW },
    );
    expect(sp.baseCity).toBeUndefined();
  });
});

describe('mapCitapasion — personalDetails', () => {
  it('age mapped', async () => {
    const sp = await mapCitapasion(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.personalDetails.ageYears).toBe(28);
  });

  it('nationality resolved', async () => {
    const sp = await mapCitapasion(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.personalDetails.nationalityId).toBe('nationality:colombiana');
  });

  it('hair resolved', async () => {
    const sp = await mapCitapasion(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.personalDetails.hairId).toBe('hair:morena');
  });
});

describe('mapCitapasion — reviews', () => {
  it('reviewsEnabled when siteRating present', async () => {
    const sp = await mapCitapasion(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.reviewsEnabled).toBe(true);
    expect(sp.reviewsRating).toBe(4.5);
    expect(sp.reviewsCount).toBe(12);
  });

  it('reviewsEnabled false when no siteRating', async () => {
    const sp = await mapCitapasion(
      { ...BASE_PAYLOAD, siteRating: undefined },
      new FakeTaxonomyResolver(),
      { now: NOW },
    );
    expect(sp.reviewsEnabled).toBe(false);
    expect(sp.reviewsRating).toBe(0);
  });
});

describe('mapCitapasion — ScraperMeta', () => {
  it('confidence = medium (0.7)', async () => {
    const sp = await mapCitapasion(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.confidence).toBeGreaterThan(0.5);
  });

  it('timestamps set to now', async () => {
    const sp = await mapCitapasion(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.createdAt).toBe(NOW.toISOString());
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });
});
