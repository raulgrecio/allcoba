import { describe, expect, it } from 'vitest';

import type { Madrid69Payload } from '#infrastructure/adapters/sources/dating/madrid69/madrid69.types.js';
import {
  MADRID69_SOURCE,
  mapMadrid69,
} from '#infrastructure/adapters/sources/dating/madrid69/madrid69.mapper.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';

const NOW = new Date('2026-01-01T00:00:00.000Z');

const BASE_PAYLOAD: Madrid69Payload = {
  sourceId: '44064',
  sourceUrl: 'https://www.madrid69.com/citas-chicas-madrid-44064-thalia-pura-ternura-644417235',
  title: 'Kheila, pura ternura - tel: 644417235 | Conocer chicas en Madrid.',
  nickname: 'Kheila',
  bio: 'Soy Kheila, una chica auténtica, educada y elegante.',
  phone: '644417235',
  whatsappPhone: '644417235',
  photos: [
    { src: 'https://api.madrid69.com/storage/images/abc/foto1.jpg' },
    { src: 'https://api.madrid69.com/storage/images/abc/foto2.jpg' },
  ],
  city: 'Madrid',
  age: 25,
  heightCm: 168,
  weightKg: 58,
  nationality: 'Colombia',
  languages: ['Español', 'Inglés'],
  isVerified: false,
  isVip: false,
  services: ['Besos', 'Novia'],
};

describe('mapMadrid69 — identity', () => {
  it('providerId prefixed with source', async () => {
    const sp = await mapMadrid69(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.id).toBe(`${MADRID69_SOURCE}:44064`);
  });

  it('vertical = dating, category = escorts', async () => {
    const sp = await mapMadrid69(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.vertical).toBe('dating');
    expect(sp.category).toBe('escorts');
  });

  it('externalRef source = madrid69', async () => {
    const sp = await mapMadrid69(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.externalRefs[0]?.source).toBe(MADRID69_SOURCE);
  });

  it('nickname from payload', async () => {
    const sp = await mapMadrid69(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.nickname).toBe('Kheila');
  });
});

describe('mapMadrid69 — phone', () => {
  it('maps phone and whatsapp', async () => {
    const sp = await mapMadrid69(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.phoneNumber).toBe('644417235');
    expect(sp.contactOptions).toContain('calls');
    expect(sp.contactOptions).toContain('whatsapp');
  });

  it('no phone → undefined phoneNumber, empty contactOptions', async () => {
    const sp = await mapMadrid69(
      { ...BASE_PAYLOAD, phone: undefined, whatsappPhone: undefined },
      new FakeTaxonomyResolver(),
      { now: NOW },
    );
    expect(sp.phoneNumber).toBeUndefined();
    expect(sp.contactOptions).toEqual([]);
  });
});

describe('mapMadrid69 — photos', () => {
  it('maps 2 photos', async () => {
    const sp = await mapMadrid69(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.photos).toHaveLength(2);
    expect(sp.photos[0]!.isPrimary).toBe(true);
    expect(sp.photos[1]!.isPrimary).toBe(false);
    expect(sp.statistics!.photoCount).toBe(2);
  });
});

describe('mapMadrid69 — city', () => {
  it('resolves city via taxonomy', async () => {
    const sp = await mapMadrid69(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.baseCity?.id).toContain('madrid');
  });

  it('no city → baseCity undefined', async () => {
    const sp = await mapMadrid69({ ...BASE_PAYLOAD, city: undefined }, new FakeTaxonomyResolver(), {
      now: NOW,
    });
    expect(sp.baseCity).toBeUndefined();
  });
});

describe('mapMadrid69 — confidence', () => {
  it('medium when age present (API data)', async () => {
    const sp = await mapMadrid69(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.confidence).toBe(0.8);
  });

  it('low when no age or nationality (head-only)', async () => {
    const sp = await mapMadrid69(
      { ...BASE_PAYLOAD, age: undefined, nationality: undefined },
      new FakeTaxonomyResolver(),
      { now: NOW },
    );
    expect(sp.confidence).toBe(0.5);
  });
});

describe('mapMadrid69 — attributes', () => {
  it('heightCm and weightKg in attributes', async () => {
    const sp = await mapMadrid69(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.attributes).toMatchObject({ heightCm: 168, weightKg: 58 });
  });

  it('languages in attributes', async () => {
    const sp = await mapMadrid69(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect((sp.attributes as Record<string, unknown>).languages).toEqual(['Español', 'Inglés']);
  });

  it('services in attributes', async () => {
    const sp = await mapMadrid69(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect((sp.attributes as Record<string, unknown>).services).toContain('Besos');
  });

  it('vip badge set when isVip = true', async () => {
    const sp = await mapMadrid69({ ...BASE_PAYLOAD, isVip: true }, new FakeTaxonomyResolver(), {
      now: NOW,
    });
    expect(sp.badges.vip).toBe(true);
  });
});

describe('mapMadrid69 — timestamps', () => {
  it('timestamps set to now', async () => {
    const sp = await mapMadrid69(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
    expect(sp.createdAt).toBe(NOW.toISOString());
  });
});
