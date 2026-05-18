import { beforeAll, describe, expect, it } from 'vitest';
import { extractWallapop } from '#infrastructure/adapters/sources/general/wallapop/wallapop.extractor.js';
import type { WallapopPayload } from '#infrastructure/adapters/sources/general/wallapop/wallapop.types.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://wallapop.com/item/cortacesped-honda-1263612321';

describe('extractWallapop — fixture cortacesped_1263612321', () => {
  let p: WallapopPayload;
  beforeAll(() => {
    p = extractWallapop(loadHtml('cortacesped_1263612321.html'), SOURCE_URL);
  });

  it('sourceId from item.id (3zlm7wr9nnjx)', () => expect(p.sourceId).toBe('3zlm7wr9nnjx'));
  it('title = Cortacésped Honda', () => expect(p.title).toBe('Cortacésped Honda'));
  it('priceAmount = 500', () => expect(p.priceAmount).toBe(500));
  it('currency = EUR', () => expect(p.currency).toBe('EUR'));
  it('condition = as-new', () => expect(p.condition).toBe('as-new'));
  it('city = La Ara', () => expect(p.city).toBe('La Ara'));
  it('postalCode = 33160', () => expect(p.postalCode).toBe('33160'));
  it('coordinates present', () => {
    expect(p.coordinates?.lat).toBeCloseTo(43.2349, 3);
    expect(p.coordinates?.lng).toBeCloseTo(-5.878, 3);
  });
  it('categoryPath includes "Hogar y jardín"', () =>
    expect(p.categoryPath).toContain('Hogar y jardín'));
  it('photos count >= 1', () => expect(p.photos.length).toBeGreaterThanOrEqual(1));
  it('photo big URL has W800 size', () =>
    expect(p.photos[0]?.url).toContain('W800'));
});

describe('extractWallapop — minimal HTML', () => {
  it('returns defaults when no NEXT_DATA', () => {
    const html = '<html><head></head><body></body></html>';
    const p = extractWallapop(html, 'https://wallapop.com/item/foo-1234567890');
    expect(p.sourceId).toBe('1234567890');
    expect(p.title).toBe('');
    expect(p.priceAmount).toBeUndefined();
    expect(p.photos).toHaveLength(0);
  });
});
