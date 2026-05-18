import { describe, expect, it } from 'vitest';
import { extractCochesNet } from '#infrastructure/adapters/sources/motor/coches-net/coches-net.extractor.js';
import {
  COCHES_NET_SOURCE,
  mapCochesNet,
} from '#infrastructure/adapters/sources/motor/coches-net/coches-net.mapper.js';
import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL =
  'https://www.coches.net/km-0/peugeot/e-408/asturias/e408-gt-electrico-210-157kw-electrico-hibrido-de-km0-61537261-kovn.aspx';
const NOW = new Date('2026-05-18T00:00:00.000Z');

describe('coches-net pipeline — SSR JSON → ScrapedVehicle', () => {
  it('extract + map produces valid ScrapedVehicle', async () => {
    const html = loadHtml('peugeot_61537261.html');
    const payload = extractCochesNet(html, SOURCE_URL);
    const sv = await mapCochesNet(payload, new FakeTaxonomyResolver(), { now: NOW });

    expect(sv.id).toContain(COCHES_NET_SOURCE);
    expect(sv.vertical).toBe('motor');
    expect(sv.priceAmount).toBe(34500);
    expect(sv.make).toBe('PEUGEOT');
    expect(sv.fuelType).toBe('electric');
    expect(sv.transmission).toBe('automatic');
    expect(sv.year).toBe(2025);
    expect(sv.photos.length).toBeGreaterThanOrEqual(20);
    expect(sv.externalRefs[0]?.source).toBe(COCHES_NET_SOURCE);
    expect(sv.lastScrapedAt).toBe(NOW.toISOString());
  });
});
