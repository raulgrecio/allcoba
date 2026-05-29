import { describe, expect, it } from 'vitest';

import type { FotocasaPayload } from '#infrastructure/adapters/sources/real-estate/fotocasa/fotocasa.types.js';
import {
  FOTOCASA_SOURCE,
  mapFotocasa,
} from '#infrastructure/adapters/sources/real-estate/fotocasa/fotocasa.mapper.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';

const NOW = new Date('2026-05-18T00:00:00.000Z');

const BASE_PAYLOAD: FotocasaPayload = {
  sourceId: '188764809',
  sourceUrl: 'https://www.fotocasa.es/es/comprar/vivienda/madrid-capital/abc/188764809/d',
  title: 'Piso en venta en C. de Antonio Acuña',
  description: 'Huspy presenta este impecable piso de 80 m².',
  listingType: 'sale',
  propertyType: 'flat',
  priceAmount: 1180000,
  priceMode: 'total',
  city: 'Madrid Capital',
  neighborhood: 'Ibiza de Madrid',
  street: 'C. de Antonio Acuña',
  postalCode: '28009',
  coordinates: { lat: 40.4207, lng: -3.6789 },
  surfaceM2: 80,
  roomsCount: 2,
  bathroomsCount: 2,
  floor: '1ª',
  hasElevator: true,
  hasAirConditioning: true,
  hasHeating: true,
  hasFurnished: true,
  energyConsumptionRating: 'G',
  energyEmissionsRating: 'G',
  photos: [
    { position: 1, url: 'https://static.fotocasa.es/images/ads/photo1.jpg?rule=original' },
    { position: 2, url: 'https://static.fotocasa.es/images/ads/photo2.jpg?rule=original' },
  ],
  agencyName: 'Huspy',
};

describe('mapFotocasa — identity', () => {
  it('providerId prefixed with source', async () => {
    const sp = await mapFotocasa(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.id).toBe(`${FOTOCASA_SOURCE}:188764809`);
  });

  it('vertical = real-estate', async () => {
    const sp = await mapFotocasa(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.vertical).toBe('real-estate');
  });

  it('externalRef source = fotocasa', async () => {
    const sp = await mapFotocasa(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.externalRefs[0]?.source).toBe(FOTOCASA_SOURCE);
    expect(sp.externalRefs[0]?.sourceId).toBe('188764809');
  });
});

describe('mapFotocasa — listing data', () => {
  it('listingType passed through', async () => {
    const sp = await mapFotocasa(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.listingType).toBe('sale');
    expect(sp.priceMode).toBe('total');
  });

  it('priceAmount and currency EUR', async () => {
    const sp = await mapFotocasa(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.priceAmount).toBe(1180000);
    expect(sp.currency).toBe('EUR');
  });

  it('rent listing keeps per-month price mode', async () => {
    const sp = await mapFotocasa(
      { ...BASE_PAYLOAD, listingType: 'rent', priceMode: 'per-month', priceAmount: 1500 },
      new FakeTaxonomyResolver(),
      { now: NOW },
    );
    expect(sp.listingType).toBe('rent');
    expect(sp.priceMode).toBe('per-month');
    expect(sp.priceAmount).toBe(1500);
  });
});

describe('mapFotocasa — structural', () => {
  it('surface/rooms/bathrooms/floor passed through', async () => {
    const sp = await mapFotocasa(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.surfaceM2).toBe(80);
    expect(sp.roomsCount).toBe(2);
    expect(sp.bathroomsCount).toBe(2);
    expect(sp.floor).toBe('1ª');
  });
});

describe('mapFotocasa — location', () => {
  it('city resolved via taxonomy', async () => {
    const sp = await mapFotocasa(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.baseCity?.id).toContain('madrid');
  });

  it('no city → baseCity undefined', async () => {
    const sp = await mapFotocasa({ ...BASE_PAYLOAD, city: undefined }, new FakeTaxonomyResolver(), {
      now: NOW,
    });
    expect(sp.baseCity).toBeUndefined();
  });

  it('coordinates and postalCode preserved', async () => {
    const sp = await mapFotocasa(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.coordinates?.lat).toBe(40.4207);
    expect(sp.postalCode).toBe('28009');
  });

  it('addressText composed from street + neighborhood + city', async () => {
    const sp = await mapFotocasa(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.addressText?.original).toContain('Antonio Acuña');
    expect(sp.addressText?.original).toContain('Ibiza de Madrid');
  });
});

describe('mapFotocasa — features', () => {
  it('feature booleans mapped', async () => {
    const sp = await mapFotocasa(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.features.hasElevator).toBe(true);
    expect(sp.features.hasAirConditioning).toBe(true);
    expect(sp.features.hasHeating).toBe(true);
    expect(sp.features.hasFurnished).toBe(true);
  });
});

describe('mapFotocasa — energy', () => {
  it('energyCertificate populated when ratings present', async () => {
    const sp = await mapFotocasa(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.energyCertificate?.consumptionRating).toBe('G');
    expect(sp.energyCertificate?.emissionsRating).toBe('G');
  });

  it('no ratings → energyCertificate undefined', async () => {
    const sp = await mapFotocasa(
      { ...BASE_PAYLOAD, energyConsumptionRating: undefined, energyEmissionsRating: undefined },
      new FakeTaxonomyResolver(),
      { now: NOW },
    );
    expect(sp.energyCertificate).toBeUndefined();
  });
});

describe('mapFotocasa — photos', () => {
  it('maps photos with isPrimary on first', async () => {
    const sp = await mapFotocasa(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.photos).toHaveLength(2);
    expect(sp.photos[0]?.isPrimary).toBe(true);
    expect(sp.photos[1]?.isPrimary).toBe(false);
    expect(sp.statistics?.photoCount).toBe(2);
  });
});

describe('mapFotocasa — confidence', () => {
  it('confidence = high (structured JSON)', async () => {
    const sp = await mapFotocasa(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.confidence).toBe(0.95);
  });
});

describe('mapFotocasa — timestamps', () => {
  it('all timestamps set to now', async () => {
    const sp = await mapFotocasa(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
    expect(sp.createdAt).toBe(NOW.toISOString());
    expect(sp.updatedAt).toBe(NOW.toISOString());
  });
});
