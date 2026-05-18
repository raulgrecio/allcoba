import { beforeAll, describe, expect, it } from 'vitest';
import { extractCochesNet } from '#infrastructure/adapters/sources/motor/coches-net/coches-net.extractor.js';
import type { CochesNetPayload } from '#infrastructure/adapters/sources/motor/coches-net/coches-net.types.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL =
  'https://www.coches.net/km-0/peugeot/e-408/asturias/e408-gt-electrico-210-157kw-electrico-hibrido-de-km0-61537261-kovn.aspx';

describe('extractCochesNet — fixture peugeot_61537261', () => {
  let p: CochesNetPayload;
  beforeAll(() => {
    p = extractCochesNet(loadHtml('peugeot_61537261.html'), SOURCE_URL);
  });

  it('sourceId = 61537261', () => expect(p.sourceId).toBe('61537261'));
  it('title contains PEUGEOT', () => expect(p.title).toContain('PEUGEOT'));
  it('priceAmount = 34500', () => expect(p.priceAmount).toBe(34500));
  it('year = 2025', () => expect(p.year).toBe(2025));
  it('km = 1', () => expect(p.kilometers).toBe(1));
  it('make = PEUGEOT', () => expect(p.make).toBe('PEUGEOT'));
  it('model = E-408', () => expect(p.model).toBe('E-408'));
  it('fuelType = electric', () => expect(p.fuelType).toBe('electric'));
  it('transmission = automatic', () => expect(p.transmission).toBe('automatic'));
  it('color = white (stripped translation key)', () => expect(p.color).toBe('white'));
  it('environmentalLabel = 0', () => expect(p.environmentalLabel).toBe('0'));
  it('province = Asturias', () => expect(p.province).toBe('Asturias'));
  it('condition = km-0 (offerType 2)', () => expect(p.condition).toBe('km-0'));
  it('photos count >= 20', () => expect(p.photos.length).toBeGreaterThanOrEqual(20));
  it('first photo URL valid', () => expect(p.photos[0]?.url).toContain('http'));
  it('isProfessional = true', () => expect(p.isProfessional).toBe(true));
  it('warrantyMonths = 48', () => expect(p.warrantyMonths).toBe(48));
});

describe('extractCochesNet — minimal HTML', () => {
  it('returns defaults when no INITIAL_PROPS', () => {
    const html = '<html><head></head><body></body></html>';
    const p = extractCochesNet(html, 'https://www.coches.net/foo-12345678-x.aspx');
    expect(p.sourceId).toBe('12345678');
    expect(p.title).toBe('');
    expect(p.priceAmount).toBe(0);
    expect(p.photos).toHaveLength(0);
    expect(p.isProfessional).toBe(false);
  });
});
