import { describe, expect, it } from 'vitest';
import {
  COCHES_NET_SOURCE,
  mapCochesNet,
} from '#infrastructure/adapters/sources/motor/coches-net/coches-net.mapper.js';
import type { CochesNetPayload } from '#infrastructure/adapters/sources/motor/coches-net/coches-net.types.js';
import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';

const NOW = new Date('2026-05-18T00:00:00.000Z');

const BASE: CochesNetPayload = {
  sourceId: '61537261',
  sourceUrl: 'https://www.coches.net/x-61537261-k.aspx',
  title: 'PEUGEOT E-408 GT',
  description: 'Vehículo eléctrico KM0',
  priceAmount: 34500,
  make: 'PEUGEOT',
  model: 'E-408',
  version: 'GT 157kW',
  year: 2025,
  kilometers: 1,
  fuelType: 'electric',
  transmission: 'automatic',
  bodyType: 'sedan',
  color: 'white',
  environmentalLabel: '0',
  condition: 'km-0',
  province: 'Asturias',
  photos: [
    { position: 1, url: 'https://a.ccdn.es/cnet/1.jpg' },
    { position: 2, url: 'https://a.ccdn.es/cnet/2.jpg' },
  ],
  isProfessional: true,
  warrantyMonths: 48,
  hasOfficialWarranty: false,
};

describe('mapCochesNet — identity', () => {
  it('providerId prefixed with source', async () => {
    const sv = await mapCochesNet(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sv.id).toBe(`${COCHES_NET_SOURCE}:61537261`);
  });

  it('vertical = motor', async () => {
    const sv = await mapCochesNet(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sv.vertical).toBe('motor');
  });

  it('externalRef source = coches-net', async () => {
    const sv = await mapCochesNet(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sv.externalRefs[0]?.source).toBe(COCHES_NET_SOURCE);
  });
});

describe('mapCochesNet — fields', () => {
  it('make/model/version passed through', async () => {
    const sv = await mapCochesNet(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sv.make).toBe('PEUGEOT');
    expect(sv.model).toBe('E-408');
    expect(sv.version).toBe('GT 157kW');
  });

  it('price/currency = EUR', async () => {
    const sv = await mapCochesNet(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sv.priceAmount).toBe(34500);
    expect(sv.currency).toBe('EUR');
  });

  it('year/km/condition', async () => {
    const sv = await mapCochesNet(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sv.year).toBe(2025);
    expect(sv.kilometers).toBe(1);
    expect(sv.condition).toBe('km-0');
  });

  it('environmentalLabel/color preserved', async () => {
    const sv = await mapCochesNet(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sv.environmentalLabel).toBe('0');
    expect(sv.color).toBe('white');
  });
});

describe('mapCochesNet — location', () => {
  it('province resolves via taxonomy', async () => {
    const sv = await mapCochesNet(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sv.baseCity?.id).toContain('asturias');
  });

  it('no province → baseCity undefined', async () => {
    const sv = await mapCochesNet(
      { ...BASE, province: undefined },
      new FakeTaxonomyResolver(),
      { now: NOW },
    );
    expect(sv.baseCity).toBeUndefined();
  });
});

describe('mapCochesNet — photos', () => {
  it('first marked isPrimary', async () => {
    const sv = await mapCochesNet(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sv.photos).toHaveLength(2);
    expect(sv.photos[0]?.isPrimary).toBe(true);
    expect(sv.photos[1]?.isPrimary).toBe(false);
    expect(sv.statistics?.photoCount).toBe(2);
  });
});

describe('mapCochesNet — confidence', () => {
  it('confidence = high (structured JSON)', async () => {
    const sv = await mapCochesNet(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sv.confidence).toBe(0.95);
  });
});

describe('mapCochesNet — attributes', () => {
  it('isProfessional + warrantyMonths in attributes', async () => {
    const sv = await mapCochesNet(BASE, new FakeTaxonomyResolver(), { now: NOW });
    expect(sv.attributes.isProfessional).toBe(true);
    expect(sv.attributes.warrantyMonths).toBe(48);
  });
});
