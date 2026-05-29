import { describe, expect, it } from 'vitest';

import type { IdealistaPayload } from '#infrastructure/adapters/sources/real-estate/idealista/idealista.types.js';
import {
  IDEALISTA_SOURCE,
  mapIdealista,
} from '#infrastructure/adapters/sources/real-estate/idealista/idealista.mapper.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';

const NOW = new Date('2026-05-18T00:00:00.000Z');

const BASE: IdealistaPayload = {
  sourceId: '110715434',
  sourceUrl: 'https://www.idealista.com/inmueble/110715434/',
  title: 'Ático en venta en Calle de Isabel la Católica',
  description: 'Ático luminoso',
  listingType: 'sale',
  propertyType: 'penthouse',
  priceAmount: 1400000,
  priceMode: 'total',
  city: 'Madrid',
  neighborhood: 'Palacio',
  street: 'Calle de Isabel la Católica',
  surfaceM2: 177,
  roomsCount: 2,
  bathroomsCount: 2,
  floor: '6ª',
  buildYear: 1944,
  hasElevator: true,
  hasAirConditioning: true,
  hasHeating: true,
  energyConsumptionRating: 'C',
  energyEmissionsRating: 'C',
  photos: [
    { position: 1, url: 'https://img4.idealista.com/blur/WEB_DETAIL/0/x/1.jpg' },
    { position: 2, url: 'https://img4.idealista.com/blur/WEB_DETAIL/0/x/2.jpg' },
  ],
};

describe('mapIdealista — identity', () => {
  it('providerId prefixed with source', async () => {
    const sp = await mapIdealista(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.id).toBe(`${IDEALISTA_SOURCE}:110715434`);
  });
  it('vertical = real-estate', async () => {
    const sp = await mapIdealista(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.vertical).toBe('real-estate');
  });
  it('externalRef source = idealista', async () => {
    const sp = await mapIdealista(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.externalRefs[0]?.source).toBe(IDEALISTA_SOURCE);
  });
});

describe('mapIdealista — listing data', () => {
  it('listingType + priceMode passthrough', async () => {
    const sp = await mapIdealista(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.listingType).toBe('sale');
    expect(sp.priceMode).toBe('total');
  });
  it('price + currency EUR', async () => {
    const sp = await mapIdealista(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.priceAmount).toBe(1400000);
    expect(sp.currency).toBe('EUR');
  });
  it('rent variant', async () => {
    const sp = await mapIdealista(
      { ...BASE, listingType: 'rent', priceMode: 'per-month', priceAmount: 2500 },
      new FakeTaxonomyResolver(),
      { now: NOW },
    );
    expect(sp.listingType).toBe('rent');
    expect(sp.priceMode).toBe('per-month');
  });
});

describe('mapIdealista — structural', () => {
  it('surface/rooms/bathrooms/floor/buildYear passthrough', async () => {
    const sp = await mapIdealista(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.surfaceM2).toBe(177);
    expect(sp.roomsCount).toBe(2);
    expect(sp.bathroomsCount).toBe(2);
    expect(sp.floor).toBe('6ª');
    expect(sp.buildYear).toBe(1944);
  });
});

describe('mapIdealista — location', () => {
  it('city resolved via taxonomy', async () => {
    const sp = await mapIdealista(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.baseCity?.id).toContain('madrid');
  });
  it('addressText composed', async () => {
    const sp = await mapIdealista(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.addressText?.original).toContain('Isabel la Católica');
    expect(sp.addressText?.original).toContain('Palacio');
    expect(sp.addressText?.original).toContain('Madrid');
  });
});

describe('mapIdealista — features', () => {
  it('feature booleans mapped', async () => {
    const sp = await mapIdealista(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.features.hasElevator).toBe(true);
    expect(sp.features.hasAirConditioning).toBe(true);
    expect(sp.features.hasHeating).toBe(true);
  });
});

describe('mapIdealista — energy', () => {
  it('certificate populated', async () => {
    const sp = await mapIdealista(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.energyCertificate?.consumptionRating).toBe('C');
    expect(sp.energyCertificate?.emissionsRating).toBe('C');
  });
  it('no ratings → undefined', async () => {
    const sp = await mapIdealista(
      { ...BASE, energyConsumptionRating: undefined, energyEmissionsRating: undefined },
      new FakeTaxonomyResolver(),
      { now: NOW },
    );
    expect(sp.energyCertificate).toBeUndefined();
  });
});

describe('mapIdealista — photos', () => {
  it('first marked primary', async () => {
    const sp = await mapIdealista(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.photos).toHaveLength(2);
    expect(sp.photos[0]?.isPrimary).toBe(true);
    expect(sp.statistics?.photoCount).toBe(2);
  });
});

describe('mapIdealista — confidence', () => {
  it('confidence = medium (DOM scraping)', async () => {
    const sp = await mapIdealista(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.confidence).toBe(0.8);
  });
});
