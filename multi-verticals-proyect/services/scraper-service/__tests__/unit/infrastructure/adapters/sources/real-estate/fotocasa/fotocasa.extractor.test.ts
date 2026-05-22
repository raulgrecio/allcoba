import { beforeAll, describe, expect, it } from 'vitest';

import type { FotocasaPayload } from '#infrastructure/adapters/sources/real-estate/fotocasa/fotocasa.types.js';
import { extractFotocasa } from '#infrastructure/adapters/sources/real-estate/fotocasa/fotocasa.extractor.js';

import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL =
  'https://www.fotocasa.es/es/comprar/vivienda/madrid-capital/aire-acondicionado-calefaccion-ascensor-amueblado/188764809/d';

describe('extractFotocasa — fixture madrid_188764809 (SSR JSON)', () => {
  let payload: FotocasaPayload;

  beforeAll(() => {
    const html = loadHtml('madrid_188764809.html');
    payload = extractFotocasa(html, SOURCE_URL);
  });

  it('sourceId = numeric propertyId from URL', () => expect(payload.sourceId).toBe('188764809'));
  it('sourceUrl preserved', () => expect(payload.sourceUrl).toBe(SOURCE_URL));
  it('title from propertyTitle', () => expect(payload.title).toContain('Piso en venta'));
  it('listingType = sale', () => expect(payload.listingType).toBe('sale'));
  it('priceMode = total (sale)', () => expect(payload.priceMode).toBe('total'));
  it('propertyType = flat', () => expect(payload.propertyType).toBe('flat'));
  it('priceAmount = 1180000', () => expect(payload.priceAmount).toBe(1180000));
  it('description includes Huspy', () => expect(payload.description).toContain('Huspy'));
  it('city = Madrid Capital (cleaned)', () => expect(payload.city).toBe('Madrid Capital'));
  it('neighborhood = Ibiza de Madrid', () => expect(payload.neighborhood).toBe('Ibiza de Madrid'));
  it('street = C. de Antonio Acuña', () => expect(payload.street).toContain('Antonio Acuña'));
  it('postalCode = 28009', () => expect(payload.postalCode).toBe('28009'));
  it('coordinates present', () => {
    expect(payload.coordinates?.lat).toBeCloseTo(40.4207, 2);
    expect(payload.coordinates?.lng).toBeCloseTo(-3.6789, 2);
  });
  it('surfaceM2 = 80', () => expect(payload.surfaceM2).toBe(80));
  it('roomsCount = 2', () => expect(payload.roomsCount).toBe(2));
  it('bathroomsCount = 2', () => expect(payload.bathroomsCount).toBe(2));
  it('floor = 1ª (from 1ST_FLOOR)', () => expect(payload.floor).toBe('1ª'));
  it('hasElevator = true', () => expect(payload.hasElevator).toBe(true));
  it('hasFurnished = true', () => expect(payload.hasFurnished).toBe(true));
  it('hasAirConditioning = true (from extras)', () =>
    expect(payload.hasAirConditioning).toBe(true));
  it('hasHeating = true (from extras)', () => expect(payload.hasHeating).toBe(true));
  it('energyConsumptionRating = G', () => expect(payload.energyConsumptionRating).toBe('G'));
  it('energyEmissionsRating = G', () => expect(payload.energyEmissionsRating).toBe('G'));
  it('photos count >= 20', () => expect(payload.photos.length).toBeGreaterThanOrEqual(20));
  it('first photo points to static.fotocasa.es', () =>
    expect(payload.photos[0]?.url).toContain('static.fotocasa.es'));
  it('agencyName = Huspy', () => expect(payload.agencyName).toBe('Huspy'));
});

describe('extractFotocasa — minimal HTML without INITIAL_DATA', () => {
  it('returns payload with defaults', () => {
    const html = '<html><head></head><body></body></html>';
    const p = extractFotocasa(html, 'https://www.fotocasa.es/es/comprar/123456/d');
    expect(p.sourceId).toBe('123456');
    expect(p.title).toBe('');
    expect(p.listingType).toBe('sale');
    expect(p.priceAmount).toBe(0);
    expect(p.photos).toHaveLength(0);
  });
});
