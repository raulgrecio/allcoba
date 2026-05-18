import { describe, expect, it } from 'vitest';
import {
  WALLAPOP_SOURCE,
  mapWallapop,
} from '#infrastructure/adapters/sources/general/wallapop/wallapop.mapper.js';
import type { WallapopPayload } from '#infrastructure/adapters/sources/general/wallapop/wallapop.types.js';
import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';

const NOW = new Date('2026-05-18T00:00:00.000Z');

const BASE: WallapopPayload = {
  sourceId: '3zlm7wr9nnjx',
  sourceUrl: 'https://wallapop.com/item/cortacesped-honda-1263612321',
  title: 'Cortacésped Honda',
  description: 'Como nuevo',
  priceAmount: 500,
  currency: 'EUR',
  condition: 'as-new',
  shipping: 'not-allowed',
  city: 'La Ara',
  postalCode: '33160',
  coordinates: { lat: 43.2349, lng: -5.878 },
  categoryPath: ['Hogar y jardín', 'Jardín y exteriores'],
  photos: [{ position: 1, url: 'https://cdn.wallapop.com/1.jpg?pictureSize=W800' }],
  views: 100,
  favorites: 5,
};

describe('mapWallapop — identity', () => {
  it('providerId prefixed with source', async () => {
    const sl = await mapWallapop(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sl.id).toBe(`${WALLAPOP_SOURCE}:3zlm7wr9nnjx`);
  });
  it('vertical = general', async () => {
    const sl = await mapWallapop(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sl.vertical).toBe('general');
  });
  it('externalRef source = wallapop', async () => {
    const sl = await mapWallapop(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sl.externalRefs[0]?.source).toBe(WALLAPOP_SOURCE);
  });
});

describe('mapWallapop — fields', () => {
  it('title + price', async () => {
    const sl = await mapWallapop(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sl.title).toBe('Cortacésped Honda');
    expect(sl.priceAmount).toBe(500);
    expect(sl.currency).toBe('EUR');
  });
  it('condition + shipping', async () => {
    const sl = await mapWallapop(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sl.condition).toBe('as-new');
    expect(sl.shipping).toBe('not-allowed');
  });
  it('categoryPath passthrough', async () => {
    const sl = await mapWallapop(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sl.categoryPath).toContain('Hogar y jardín');
  });
});

describe('mapWallapop — location', () => {
  it('city resolves via taxonomy', async () => {
    const sl = await mapWallapop(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sl.baseCity?.id).toContain('la-ara');
  });
  it('postalCode + coordinates preserved', async () => {
    const sl = await mapWallapop(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sl.postalCode).toBe('33160');
    expect(sl.coordinates?.lat).toBe(43.2349);
  });
});

describe('mapWallapop — photos', () => {
  it('first marked primary', async () => {
    const sl = await mapWallapop(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sl.photos).toHaveLength(1);
    expect(sl.photos[0]?.isPrimary).toBe(true);
  });
});

describe('mapWallapop — statistics', () => {
  it('views + favorites + photoCount', async () => {
    const sl = await mapWallapop(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sl.statistics?.views).toBe(100);
    expect(sl.statistics?.favorites).toBe(5);
    expect(sl.statistics?.photoCount).toBe(1);
  });
});

describe('mapWallapop — confidence', () => {
  it('confidence = high', async () => {
    const sl = await mapWallapop(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sl.confidence).toBe(0.95);
  });
});
