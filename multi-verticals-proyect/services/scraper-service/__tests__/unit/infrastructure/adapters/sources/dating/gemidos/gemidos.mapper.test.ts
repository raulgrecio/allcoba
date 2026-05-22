import { describe, expect, it } from 'vitest';

import type { GemidosPayload } from '#infrastructure/adapters/sources/dating/gemidos/gemidos.types.js';
import {
  GEMIDOS_SOURCE,
  mapGemidos,
} from '#infrastructure/adapters/sources/dating/gemidos/gemidos.mapper.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const SOURCE_URL = 'https://gemidos.tv/anuncio/lucia-escort-madrid/';

const BASE_PAYLOAD: GemidosPayload = {
  sourceId: 'lucia-escort-madrid',
  sourceUrl: SOURCE_URL,
  title: '🔥 Lucia escort Madrid',
  nickname: 'Lucia',
  bio: 'Hola, soy Lucia, escort independiente en Madrid.',
  phone: '633445566',
  params: {
    age: 26,
    heightCm: 165,
    weightKg: 52,
    measurements: '90-60-90',
    nationality: 'Colombiana',
    ethnicity: 'Morena',
    services: [
      { slug: 'servicio-gfe', label: 'GFE', category: 'services' },
      { slug: 'masaje-erotico', label: 'Masaje', category: 'massage' },
    ],
    locationTags: ['Encuentros', 'Hoteles'],
    address: 'Paseo de la castellana 193',
  },
  photos: [
    { src: 'https://cdn.gemidos.tv/fotos/lucia_1.jpg' },
    { src: 'https://cdn.gemidos.tv/fotos/lucia_2.jpg' },
  ],
  isVerified: true,
};

describe('mapGemidos — identity', () => {
  it('providerId prefixed with source', async () => {
    const sp = await mapGemidos(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.id).toBe(`${GEMIDOS_SOURCE}:lucia-escort-madrid`);
  });

  it('vertical = dating, category = escorts', async () => {
    const sp = await mapGemidos(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.vertical).toBe('dating');
    expect(sp.category).toBe('escorts');
  });

  it('externalRef source = gemidos', async () => {
    const sp = await mapGemidos(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.externalRefs[0]?.source).toBe(GEMIDOS_SOURCE);
  });
});

describe('mapGemidos — phone', () => {
  it('maps phone', async () => {
    const sp = await mapGemidos(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.phoneNumber).toBe('633445566');
    expect(sp.contactOptions).toContain('calls');
  });

  it('no phone → undefined', async () => {
    const sp = await mapGemidos({ ...BASE_PAYLOAD, phone: undefined }, new FakeTaxonomyResolver(), {
      now: NOW,
    });
    expect(sp.phoneNumber).toBeUndefined();
    expect(sp.contactOptions).toEqual([]);
  });
});

describe('mapGemidos — photos + verified', () => {
  it('maps 2 photos, first isPrimary', async () => {
    const sp = await mapGemidos(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.photos).toHaveLength(2);
    expect(sp.photos[0]!.isPrimary).toBe(true);
    expect(sp.statistics!.photoCount).toBe(2);
  });

  it('isVerified sets badge', async () => {
    const sp = await mapGemidos(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.badges.verified).toBe(true);
    expect(sp.statistics!.isVerified).toBe(true);
  });
});

describe('mapGemidos — geo', () => {
  it('baseCity always undefined (not in HTML)', async () => {
    const sp = await mapGemidos(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.baseCity).toBeUndefined();
  });
});

describe('mapGemidos — personalDetails', () => {
  it('age + nationality + ethnicity resolved', async () => {
    const sp = await mapGemidos(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.personalDetails.ageYears).toBe(26);
    expect(sp.personalDetails.nationalityId).toBe('nationality:colombiana');
    expect(sp.personalDetails.ethnicId).toBe('ethnic:morena');
  });
});

describe('mapGemidos — ScraperMeta', () => {
  it('confidence = low (CF WAF site)', async () => {
    const sp = await mapGemidos(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.confidence).toBe(0.5);
  });

  it('timestamps set to now', async () => {
    const sp = await mapGemidos(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });
});
