import { describe, expect, it } from 'vitest';

import type { HotvalenciaPayload } from '#infrastructure/adapters/sources/dating/hotvalencia/hotvalencia.types.js';
import {
  HOTVALENCIA_SOURCE,
  mapHotvalencia,
} from '#infrastructure/adapters/sources/dating/hotvalencia/hotvalencia.mapper.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const SOURCE_URL = 'https://hotvalencia.com/putas-valencia/valentina-escortvalencia/';

const BASE_PAYLOAD: HotvalenciaPayload = {
  sourceId: 'valentina-escortvalencia',
  sourceUrl: SOURCE_URL,
  title: 'Valentina escort Valencia',
  nickname: 'Valentina',
  bio: 'Hola, soy Valentina, escort independiente en Valencia.',
  phone: '611223344',
  photos: [
    { src: 'https://cdn.hotvalencia.com/fotos/valentina_1.jpg' },
    { src: 'https://cdn.hotvalencia.com/fotos/valentina_2.jpg' },
  ],
  hasVideo: false,
};

describe('mapHotvalencia — identity', () => {
  it('providerId prefixed with source', async () => {
    const sp = await mapHotvalencia(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.id).toBe(`${HOTVALENCIA_SOURCE}:valentina-escortvalencia`);
  });

  it('vertical = dating, category = escorts', async () => {
    const sp = await mapHotvalencia(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.vertical).toBe('dating');
    expect(sp.category).toBe('escorts');
  });

  it('externalRef source = hotvalencia', async () => {
    const sp = await mapHotvalencia(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.externalRefs[0]?.source).toBe(HOTVALENCIA_SOURCE);
  });
});

describe('mapHotvalencia — phone', () => {
  it('maps phone', async () => {
    const sp = await mapHotvalencia(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.phoneNumber).toBe('611223344');
    expect(sp.contactOptions).toContain('calls');
  });

  it('no phone → undefined', async () => {
    const sp = await mapHotvalencia(
      { ...BASE_PAYLOAD, phone: undefined },
      new FakeTaxonomyResolver(),
      { now: NOW },
    );
    expect(sp.phoneNumber).toBeUndefined();
    expect(sp.contactOptions).toEqual([]);
  });
});

describe('mapHotvalencia — photos', () => {
  it('maps 2 photos', async () => {
    const sp = await mapHotvalencia(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.photos).toHaveLength(2);
    expect(sp.photos[0]!.isPrimary).toBe(true);
    expect(sp.statistics!.photoCount).toBe(2);
    expect(sp.statistics!.videoCount).toBe(0);
  });

  it('hasVideo sets videoCount = 1', async () => {
    const sp = await mapHotvalencia(
      { ...BASE_PAYLOAD, hasVideo: true },
      new FakeTaxonomyResolver(),
      { now: NOW },
    );
    expect(sp.statistics!.videoCount).toBe(1);
  });
});

describe('mapHotvalencia — ScraperMeta', () => {
  it('confidence = low', async () => {
    const sp = await mapHotvalencia(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.confidence).toBe(0.5);
  });

  it('timestamps set to now', async () => {
    const sp = await mapHotvalencia(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });
});
