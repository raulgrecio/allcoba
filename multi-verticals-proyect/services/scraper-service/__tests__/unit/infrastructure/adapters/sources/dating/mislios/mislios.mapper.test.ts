import { describe, expect, it } from 'vitest';

import type { MisliosPayload } from '#infrastructure/adapters/sources/dating/mislios/mislios.types.js';
import {
  mapMislios,
  MISLIOS_SOURCE,
} from '#infrastructure/adapters/sources/dating/mislios/mislios.mapper.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const SOURCE_URL = 'https://mislios.com/anuncios/ana-escort-madrid/';

const BASE_PAYLOAD: MisliosPayload = {
  sourceId: 'ana-escort-madrid',
  sourceUrl: SOURCE_URL,
  title: 'Ana escort Madrid',
  nickname: 'Ana',
  bio: 'Hola, soy Ana, escort independiente en Madrid.',
  phone: '622345678',
  photos: [
    { src: 'https://cdn.mislios.com/fotos/ana_1.jpg' },
    { src: 'https://cdn.mislios.com/fotos/ana_2.jpg' },
  ],
};

describe('mapMislios — identity', () => {
  it('providerId prefixed with source', async () => {
    const sp = await mapMislios(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.id).toBe(`${MISLIOS_SOURCE}:ana-escort-madrid`);
  });

  it('vertical = dating, category = escorts', async () => {
    const sp = await mapMislios(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.vertical).toBe('dating');
    expect(sp.category).toBe('escorts');
  });

  it('nickname from payload', async () => {
    const sp = await mapMislios(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.nickname).toBe('Ana');
  });

  it('falls back to title when no nickname', async () => {
    const sp = await mapMislios(
      { ...BASE_PAYLOAD, nickname: undefined },
      new FakeTaxonomyResolver(),
      { now: NOW },
    );
    expect(sp.nickname).toBe('Ana escort Madrid');
  });

  it('externalRef source = mislios', async () => {
    const sp = await mapMislios(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.externalRefs[0]?.source).toBe(MISLIOS_SOURCE);
    expect(sp.externalRefs[0]?.sourceId).toBe('ana-escort-madrid');
  });
});

describe('mapMislios — phone', () => {
  it('maps phone to E164', async () => {
    const sp = await mapMislios(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.phoneNumber).toBe('622345678');
    expect(sp.contactOptions).toContain('calls');
  });

  it('no phone → undefined phoneNumber', async () => {
    const sp = await mapMislios({ ...BASE_PAYLOAD, phone: undefined }, new FakeTaxonomyResolver(), {
      now: NOW,
    });
    expect(sp.phoneNumber).toBeUndefined();
    expect(sp.contactOptions).toEqual([]);
  });
});

describe('mapMislios — photos', () => {
  it('maps 2 photos', async () => {
    const sp = await mapMislios(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.photos).toHaveLength(2);
    expect(sp.photos[0]!.isPrimary).toBe(true);
    expect(sp.photos[1]!.isPrimary).toBe(false);
    expect(sp.statistics!.photoCount).toBe(2);
  });

  it('empty photos', async () => {
    const sp = await mapMislios({ ...BASE_PAYLOAD, photos: [] }, new FakeTaxonomyResolver(), {
      now: NOW,
    });
    expect(sp.photos).toHaveLength(0);
    expect(sp.statistics!.photoCount).toBe(0);
  });
});

describe('mapMislios — geo', () => {
  it('baseCity always undefined (not in HTML)', async () => {
    const sp = await mapMislios(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.baseCity).toBeUndefined();
  });
});

describe('mapMislios — aboutMe', () => {
  it('maps bio to aboutMe.original', async () => {
    const sp = await mapMislios(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.aboutMe?.original).toBe('Hola, soy Ana, escort independiente en Madrid.');
  });

  it('no bio → aboutMe undefined', async () => {
    const sp = await mapMislios({ ...BASE_PAYLOAD, bio: undefined }, new FakeTaxonomyResolver(), {
      now: NOW,
    });
    expect(sp.aboutMe).toBeUndefined();
  });
});

describe('mapMislios — ScraperMeta', () => {
  it('confidence = low (0.5)', async () => {
    const sp = await mapMislios(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.confidence).toBe(0.5);
  });

  it('timestamps set to now', async () => {
    const sp = await mapMislios(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.createdAt).toBe(NOW.toISOString());
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });

  it('metadata.source = mislios', async () => {
    const sp = await mapMislios(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.metadata.source).toBe(MISLIOS_SOURCE);
  });
});
