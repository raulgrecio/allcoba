import { describe, expect, it } from 'vitest';
import {
  mapChicasmalas,
  CHICASMALAS_SOURCE,
} from '#infrastructure/adapters/sources/dating/chicasmalas/chicasmalas.mapper.js';
import type { ChicasmalasPayload } from '#infrastructure/adapters/sources/dating/chicasmalas/chicasmalas.types.js';
import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';

const NOW = new Date('2026-01-01T00:00:00.000Z');

const BASE_PAYLOAD: ChicasmalasPayload = {
  sourceId: 'maria-escort-espanola-en-orihuela-697394223',
  sourceUrl: 'https://www.chicasmalas.es/maria-escort-espanola-en-orihuela-697394223/',
  title: 'María Escort Española En Orihuela — Discreción Y Placer.',
  nickname: 'María',
  bio: '👠 ¡Hola! Soy María, tu escort española en Orihuela, Alicante.',
  phone: '697394223',
  whatsappPhone: '697394223',
  photos: [
    { src: 'https://www.chicasmalas.es/wp-content/uploads/2025/07/foto1.jpeg' },
    { src: 'https://www.chicasmalas.es/wp-content/uploads/2025/07/foto2.jpeg' },
  ],
  city: 'orihuela',
  isVerified: false,
};

describe('mapChicasmalas — identity', () => {
  it('providerId prefixed with source', async () => {
    const sp = await mapChicasmalas(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.id).toBe(
      `${CHICASMALAS_SOURCE}:maria-escort-espanola-en-orihuela-697394223`,
    );
  });

  it('vertical = dating, category = escorts', async () => {
    const sp = await mapChicasmalas(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.vertical).toBe('dating');
    expect(sp.category).toBe('escorts');
  });

  it('externalRef source = chicasmalas', async () => {
    const sp = await mapChicasmalas(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.externalRefs[0]?.source).toBe(CHICASMALAS_SOURCE);
  });

  it('nickname from payload', async () => {
    const sp = await mapChicasmalas(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.nickname).toBe('María');
  });
});

describe('mapChicasmalas — phone', () => {
  it('maps phone and whatsapp contact options', async () => {
    const sp = await mapChicasmalas(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.phoneNumber).toBe('697394223');
    expect(sp.contactOptions).toContain('calls');
    expect(sp.contactOptions).toContain('whatsapp');
  });

  it('no phone → undefined phoneNumber', async () => {
    const sp = await mapChicasmalas(
      { ...BASE_PAYLOAD, phone: undefined, whatsappPhone: undefined },
      new FakeTaxonomyResolver(),
      { now: NOW },
    );
    expect(sp.phoneNumber).toBeUndefined();
    expect(sp.contactOptions).toEqual([]);
  });
});

describe('mapChicasmalas — photos', () => {
  it('maps 2 photos with isPrimary on first', async () => {
    const sp = await mapChicasmalas(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.photos).toHaveLength(2);
    expect(sp.photos[0]!.isPrimary).toBe(true);
    expect(sp.photos[1]!.isPrimary).toBe(false);
    expect(sp.statistics!.photoCount).toBe(2);
  });
});

describe('mapChicasmalas — city', () => {
  it('resolves city via taxonomy', async () => {
    const sp = await mapChicasmalas(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.baseCity?.id).toContain('orihuela');
  });

  it('no city → baseCity undefined', async () => {
    const sp = await mapChicasmalas(
      { ...BASE_PAYLOAD, city: undefined },
      new FakeTaxonomyResolver(),
      { now: NOW },
    );
    expect(sp.baseCity).toBeUndefined();
  });
});

describe('mapChicasmalas — confidence', () => {
  it('confidence = low (Playwright-rendered, minimal data)', async () => {
    const sp = await mapChicasmalas(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.confidence).toBe(0.5);
  });
});

describe('mapChicasmalas — timestamps', () => {
  it('timestamps set to now', async () => {
    const sp = await mapChicasmalas(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
    expect(sp.createdAt).toBe(NOW.toISOString());
  });
});
