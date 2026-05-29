import { describe, expect, it } from 'vitest';

import { extractWallapop } from '#infrastructure/adapters/sources/general/wallapop/wallapop.extractor.js';
import {
  mapWallapop,
  WALLAPOP_SOURCE,
} from '#infrastructure/adapters/sources/general/wallapop/wallapop.mapper.js';
import { WallapopPipeline } from '#infrastructure/adapters/sources/general/wallapop/wallapop.pipeline.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://wallapop.com/item/cortacesped-honda-1263612321';
const NOW = new Date('2026-05-18T00:00:00.000Z');

describe('wallapop pipeline — NEXT_DATA → ScrapedListing', () => {
  it('extract + map produces valid ScrapedListing', async () => {
    const html = loadHtml('cortacesped_1263612321.html');
    const payload = extractWallapop(html, SOURCE_URL);
    const sl = await mapWallapop(payload, new FakeTaxonomyResolver(), { now: NOW });

    expect(sl.id).toContain(WALLAPOP_SOURCE);
    expect(sl.vertical).toBe('general');
    expect(sl.title).toBe('Cortacésped Honda');
    expect(sl.priceAmount).toBe(500);
    expect(sl.currency).toBe('EUR');
    expect(sl.condition).toBe('as-new');
    expect(sl.categoryPath).toContain('Hogar y jardín');
    expect(sl.coordinates?.lat).toBeCloseTo(43.2349, 3);
    expect(sl.externalRefs[0]?.source).toBe(WALLAPOP_SOURCE);
    expect(sl.lastScrapedAt).toBe(NOW.toISOString());
  });
});

describe('WallapopPipeline class methods', () => {
  const pipeline = new WallapopPipeline();

  it('identifier is wallapop', () => {
    expect(pipeline.identifier).toBe('wallapop');
  });

  it('canHandle wallapop.com URLs', () => {
    expect(pipeline.canHandle('https://wallapop.com/item/cortacesped-123')).toBe(true);
    expect(pipeline.canHandle('https://other.com/item/foo')).toBe(false);
  });

  it('isProfileUrl — /item/ path is a profile', () => {
    expect(pipeline.isProfileUrl('https://wallapop.com/item/cortacesped-honda-1263612321')).toBe(
      true,
    );
  });

  it('isProfileUrl — category listing is not a profile', () => {
    expect(pipeline.isProfileUrl('https://wallapop.com/motos/')).toBe(false);
  });

  it('getCrawlerOptions includes cookie selectors', () => {
    const opts = pipeline.getCrawlerOptions('https://wallapop.com/item/foo');
    expect(opts.cookieSelectors).toContain('.cmpboxbtnyes');
    expect(opts.cookieSelectors).toContain('#onetrust-accept-btn-handler');
  });

  it('extract and map methods work correctly via pipeline instance', async () => {
    const html = '<html><body><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"item":{"id":"123","title":"Test Item","price":10,"currency":"EUR","images":[]}}}}</script></body></html>';
    const payload = pipeline.extract(html, 'https://wallapop.com/item/test-123');
    expect(payload.sourceId).toBe('123');
    const sl = await pipeline.map(payload, new FakeTaxonomyResolver());
    expect(sl.vertical).toBe('general');
  });
});

