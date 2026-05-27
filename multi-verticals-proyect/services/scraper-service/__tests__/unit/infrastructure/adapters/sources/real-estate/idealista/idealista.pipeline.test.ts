import { describe, expect, it } from 'vitest';

import { extractIdealista } from '#infrastructure/adapters/sources/real-estate/idealista/idealista.extractor.js';
import {
  IDEALISTA_SOURCE,
  mapIdealista,
} from '#infrastructure/adapters/sources/real-estate/idealista/idealista.mapper.js';
import { IdealistaPipeline } from '#infrastructure/adapters/sources/real-estate/idealista/idealista.pipeline.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://www.idealista.com/inmueble/110715434/';
const NOW = new Date('2026-05-18T00:00:00.000Z');

describe('idealista pipeline — DOM → ScrapedProperty', () => {
  it('extract + map produces valid ScrapedProperty', async () => {
    const html = loadHtml('atico_110715434.html');
    const payload = extractIdealista(html, SOURCE_URL);
    const sp = await mapIdealista(payload, new FakeTaxonomyResolver(), { now: NOW });

    expect(sp.id).toContain(IDEALISTA_SOURCE);
    expect(sp.vertical).toBe('real-estate');
    expect(sp.listingType).toBe('sale');
    expect(sp.propertyType).toBe('penthouse');
    expect(sp.priceAmount).toBe(1400000);
    expect(sp.surfaceM2).toBe(177);
    expect(sp.roomsCount).toBe(2);
    expect(sp.bathroomsCount).toBe(2);
    expect(sp.floor).toBe('6ª');
    expect(sp.buildYear).toBe(1944);
    expect(sp.features.hasElevator).toBe(true);
    expect(sp.energyCertificate?.consumptionRating).toBe('C');
    expect(sp.externalRefs[0]?.source).toBe(IDEALISTA_SOURCE);
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });
});

describe('IdealistaPipeline class methods', () => {
  const pipeline = new IdealistaPipeline();

  it('identifier is idealista', () => {
    expect(pipeline.identifier).toBe('idealista');
  });

  it('canHandle idealista.com URLs', () => {
    expect(pipeline.canHandle('https://www.idealista.com/inmueble/110715434/')).toBe(true);
    expect(pipeline.canHandle('https://other.com/property/123')).toBe(false);
  });

  it('isProfileUrl — /inmueble/{id} is a profile', () => {
    expect(pipeline.isProfileUrl('https://www.idealista.com/inmueble/110715434/')).toBe(true);
  });

  it('isProfileUrl — search listing page is not a profile', () => {
    expect(pipeline.isProfileUrl('https://www.idealista.com/venta-viviendas/madrid/')).toBe(false);
  });

  it('getCrawlerOptions includes cookie selectors', () => {
    const opts = pipeline.getCrawlerOptions('https://www.idealista.com/inmueble/110715434/');
    expect(opts.cookieSelectors).toContain('#didomi-notice-agree-button');
  });

  it('extract and map methods work correctly via pipeline instance', async () => {
    const html = `<html><head>
      <meta property="og:title" content="Ático en venta en Madrid de 1.400.000 €">
    </head><body>
      <div id="main-info">
        <span class="info-data-price"><span class="txt-bold">1.400.000</span>€</span>
        <h1>Ático en venta</h1>
      </div>
    </body></html>`;
    const payload = pipeline.extract(html, 'https://www.idealista.com/inmueble/110715434/');
    expect(payload.sourceId).toBe('110715434');
    const sp = await pipeline.map(payload, new FakeTaxonomyResolver());
    expect(sp.vertical).toBe('real-estate');
  });
});

