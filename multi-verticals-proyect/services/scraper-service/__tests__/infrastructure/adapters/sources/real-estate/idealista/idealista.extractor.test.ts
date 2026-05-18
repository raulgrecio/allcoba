import { beforeAll, describe, expect, it } from 'vitest';
import { extractIdealista } from '#infrastructure/adapters/sources/real-estate/idealista/idealista.extractor.js';
import type { IdealistaPayload } from '#infrastructure/adapters/sources/real-estate/idealista/idealista.types.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://www.idealista.com/inmueble/110715434/';

describe('extractIdealista — fixture atico_110715434', () => {
  let p: IdealistaPayload;
  beforeAll(() => {
    p = extractIdealista(loadHtml('atico_110715434.html'), SOURCE_URL);
  });

  it('sourceId = 110715434', () => expect(p.sourceId).toBe('110715434'));
  it('title contains Ático en venta', () => expect(p.title).toContain('Ático en venta'));
  it('listingType = sale', () => expect(p.listingType).toBe('sale'));
  it('propertyType = penthouse', () => expect(p.propertyType).toBe('penthouse'));
  it('priceAmount = 1400000', () => expect(p.priceAmount).toBe(1400000));
  it('priceMode = total', () => expect(p.priceMode).toBe('total'));
  it('city = Madrid', () => expect(p.city).toBe('Madrid'));
  it('neighborhood = Palacio', () => expect(p.neighborhood).toBe('Palacio'));
  it('street contains Isabel la Católica', () =>
    expect(p.street).toContain('Isabel la Católica'));
  it('surfaceM2 = 177', () => expect(p.surfaceM2).toBe(177));
  it('roomsCount = 2', () => expect(p.roomsCount).toBe(2));
  it('bathroomsCount = 2', () => expect(p.bathroomsCount).toBe(2));
  it('floor = 6ª', () => expect(p.floor).toBe('6ª'));
  it('buildYear = 1944', () => expect(p.buildYear).toBe(1944));
  it('hasElevator = true', () => expect(p.hasElevator).toBe(true));
  it('hasAirConditioning = true', () => expect(p.hasAirConditioning).toBe(true));
  it('hasHeating = true', () => expect(p.hasHeating).toBe(true));
  it('energyConsumptionRating = C', () => expect(p.energyConsumptionRating).toBe('C'));
  it('energyEmissionsRating = C', () => expect(p.energyEmissionsRating).toBe('C'));
  it('photos count >= 1', () => expect(p.photos.length).toBeGreaterThanOrEqual(1));
});

describe('extractIdealista — minimal HTML', () => {
  it('returns defaults when no DOM', () => {
    const html = '<html><head></head><body></body></html>';
    const p = extractIdealista(html, 'https://www.idealista.com/inmueble/999/');
    expect(p.sourceId).toBe('999');
    expect(p.title).toBe('');
    expect(p.priceAmount).toBe(0);
    expect(p.photos).toHaveLength(0);
  });
});
