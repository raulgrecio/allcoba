import { describe, expect, it } from 'vitest';
import { mapNuevapasion, NUEVAPASION_SOURCE } from '#infrastructure/adapters/sources/dating/nuevapasion/nuevapasion.mapper.js';
import type { NuevapasionPayload } from '#infrastructure/adapters/sources/dating/nuevapasion/nuevapasion.types.js';
import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const SOURCE_URL = 'https://nuevapasion.com/anuncio/sofia-abc123';

const BASE_PAYLOAD: NuevapasionPayload = {
  sourceId: 'sofia-abc123',
  sourceUrl: SOURCE_URL,
  title: 'Sofia García',
  nickname: 'Sofia',
  bio: 'Soy Sofia, modelo independiente.',
  phone: '655123456',
  whatsappPhone: '655123456',
  photos: [
    { src: 'https://cdn.nuevapasion.com/anuncios/sofia_1.jpg' },
    { src: 'https://cdn.nuevapasion.com/anuncios/sofia_2.jpg' },
  ],
};

describe('mapNuevapasion — identity', () => {
  it('providerId prefixed with source', async () => {
    const sp = await mapNuevapasion(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.id).toBe(`${NUEVAPASION_SOURCE}:sofia-abc123`);
  });

  it('vertical = dating, category = escorts', async () => {
    const sp = await mapNuevapasion(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.vertical).toBe('dating');
    expect(sp.category).toBe('escorts');
  });

  it('nickname from payload', async () => {
    const sp = await mapNuevapasion(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.nickname).toBe('Sofia');
  });

  it('externalRef source = nuevapasion', async () => {
    const sp = await mapNuevapasion(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.externalRefs[0]?.source).toBe(NUEVAPASION_SOURCE);
    expect(sp.externalRefs[0]?.sourceId).toBe('sofia-abc123');
  });
});

describe('mapNuevapasion — phone', () => {
  it('maps phone to E164', async () => {
    const sp = await mapNuevapasion(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.phoneNumber).toBe('655123456');
    expect(sp.contactOptions).toContain('calls');
    expect(sp.contactOptions).toContain('whatsapp');
  });

  it('no phone → undefined phoneNumber', async () => {
    const sp = await mapNuevapasion(
      { ...BASE_PAYLOAD, phone: undefined, whatsappPhone: undefined },
      new FakeTaxonomyResolver(),
      { now: NOW },
    );
    expect(sp.phoneNumber).toBeUndefined();
    expect(sp.contactOptions).toEqual([]);
  });
});

describe('mapNuevapasion — photos', () => {
  it('maps 2 photos', async () => {
    const sp = await mapNuevapasion(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.photos).toHaveLength(2);
    expect(sp.photos[0]!.isPrimary).toBe(true);
    expect(sp.statistics!.photoCount).toBe(2);
  });
});

describe('mapNuevapasion — geo', () => {
  it('baseCity always undefined (not in HTML)', async () => {
    const sp = await mapNuevapasion(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.baseCity).toBeUndefined();
  });
});

describe('mapNuevapasion — aboutMe', () => {
  it('maps bio to aboutMe.original', async () => {
    const sp = await mapNuevapasion(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.aboutMe?.original).toBe('Soy Sofia, modelo independiente.');
  });
});

describe('mapNuevapasion — ScraperMeta', () => {
  it('confidence = low', async () => {
    const sp = await mapNuevapasion(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.confidence).toBe(0.5);
  });

  it('timestamps set to now', async () => {
    const sp = await mapNuevapasion(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.createdAt).toBe(NOW.toISOString());
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });
});
