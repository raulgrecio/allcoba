import { describe, expect, it } from 'vitest';

import { extractFotocasa } from '#infrastructure/adapters/sources/real-estate/fotocasa/fotocasa.extractor.js';
import {
  FOTOCASA_SOURCE,
  mapFotocasa,
} from '#infrastructure/adapters/sources/real-estate/fotocasa/fotocasa.mapper.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL =
  'https://www.fotocasa.es/es/comprar/vivienda/madrid-capital/aire-acondicionado-calefaccion-ascensor-amueblado/188764809/d';
const NOW = new Date('2026-05-18T00:00:00.000Z');

describe('fotocasa pipeline — SSR JSON → ScrapedProperty', () => {
  it('extract + map produces valid ScrapedProperty', async () => {
    const html = loadHtml('madrid_188764809.html');
    const payload = extractFotocasa(html, SOURCE_URL);
    const sp = await mapFotocasa(payload, new FakeTaxonomyResolver(), { now: NOW });

    expect(sp.id).toContain(FOTOCASA_SOURCE);
    expect(sp.vertical).toBe('real-estate');
    expect(sp.listingType).toBe('sale');
    expect(sp.priceAmount).toBe(1180000);
    expect(sp.surfaceM2).toBe(80);
    expect(sp.roomsCount).toBe(2);
    expect(sp.bathroomsCount).toBe(2);
    expect(sp.floor).toBe('1ª');
    expect(sp.features.hasElevator).toBe(true);
    expect(sp.energyCertificate?.consumptionRating).toBe('G');
    expect(sp.photos.length).toBeGreaterThanOrEqual(20);
    expect(sp.externalRefs[0]?.source).toBe(FOTOCASA_SOURCE);
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });
});
