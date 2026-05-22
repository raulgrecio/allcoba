import { describe, expect, it } from 'vitest';

import { extractWallapop } from '#infrastructure/adapters/sources/general/wallapop/wallapop.extractor.js';
import {
  mapWallapop,
  WALLAPOP_SOURCE,
} from '#infrastructure/adapters/sources/general/wallapop/wallapop.mapper.js';

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
