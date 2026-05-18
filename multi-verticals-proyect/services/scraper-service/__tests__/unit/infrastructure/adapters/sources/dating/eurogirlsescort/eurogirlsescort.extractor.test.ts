import { describe, expect, it } from 'vitest';

import {
  extractEuroGirlsEscort,
} from '#infrastructure/adapters/sources/dating/eurogirlsescort/eurogirlsescort.extractor.js';

import { loadHtmlFixture } from './helpers/load-fixtures.js';

// ============================================================================
// Real HTML — Sofia (1053224)
// ============================================================================
describe('extractEuroGirlsEscort — sofia_1053224.html', () => {
  const html = loadHtmlFixture('sofia_1053224.html');
  const payload = extractEuroGirlsEscort(html);

  it('extracts sourceId', () => {
    expect(payload.sourceId).toBe('1053224');
  });

  it('extracts sourceUrl', () => {
    expect(payload.sourceUrl).toBe('https://www.eurogirlsescort.com/escort/sofia/1053224/');
  });

  it('extracts nickname (strips ", independent" suffix)', () => {
    expect(payload.nickname).toBe('Sofia');
  });

  it('extracts bio (strips zero-width chars)', () => {
    expect(payload.bio).toBeTruthy();
    expect(payload.bio).toContain('Sofia');
    expect(payload.bio).not.toMatch(/[​‌‍⁠]/);
  });

  it('extracts lastLoginDate', () => {
    expect(payload.lastLoginDate).toBe('28.4.2026');
  });

  it('extracts verified = true', () => {
    expect(payload.verified).toBe(true);
  });

  it('extracts badges (independent + video)', () => {
    const types = payload.badges.map((b) => b.type);
    expect(types).toContain('independent');
    expect(types).toContain('video');
  });

  it('extracts params.gender, age, nationality', () => {
    expect(payload.params.gender).toBe('Female');
    expect(payload.params.age).toBe('30');
    expect(payload.params.nationality).toBe('Russian');
  });

  it('extracts city/country slugs from hrefs', () => {
    expect(payload.params.locationCitySlug).toBe('kuala-lumpur');
    expect(payload.params.locationCityName).toBe('Kuala Lumpur');
    expect(payload.params.locationCountrySlug).toBe('malaysia');
    expect(payload.params.locationCountryName).toBe('Malaysia');
  });

  it('extracts height and weight', () => {
    expect(payload.params.height).toContain('162');
    expect(payload.params.weight).toContain('55');
  });

  it('extracts orientation and ethnicity', () => {
    expect(payload.params.orientation).toBe('Bisexual');
    expect(payload.params.ethnicity).toContain('Caucasian');
  });

  it('extracts languages as array', () => {
    expect(Array.isArray(payload.params.languages)).toBe(true);
    expect(payload.params.languages).toContain('English');
  });

  it('extracts availableFor', () => {
    expect(payload.params.availableFor).toContain('Incall');
  });

  it('extracts phones with whatsapp flag', () => {
    expect(payload.phones.length).toBeGreaterThan(0);
    const phone = payload.phones[0]!;
    expect(phone.number).toContain('+60');
    expect(phone.hasWhatsapp).toBe(true);
    expect(phone.flagCountryCode).toBe('my');
  });

  it('extracts photos (multiple)', () => {
    expect(payload.photos.length).toBeGreaterThan(3);
    expect(payload.photos[0]!.href).toContain('eurogirlsescort.com');
  });

  it('extracts mapData with lat/lng', () => {
    expect(payload.mapData).toBeDefined();
    expect(payload.mapData!.lat).toBeCloseTo(3.1506, 3);
    expect(payload.mapData!.lng).toBeCloseTo(101.6945, 3);
  });

  it('extracts workingTime nonstop', () => {
    expect(payload.workingTime.nonstop).toBe(true);
  });

  it('extracts rates (multiple rows)', () => {
    expect(payload.rates.length).toBeGreaterThan(3);
    const first = payload.rates[0]!;
    expect(first.duration).toBe('0.5 Hour');
    expect(first.incallAmount).toBe(600);
    expect(first.incallCurrency).toBe('MYR');
    expect(first.incallEurAmount).toBe(130);
    expect(first.outcallAmount).toBe(1000);
  });

  it('extracts services (many rows)', () => {
    expect(payload.services.length).toBeGreaterThan(10);
    const anal = payload.services.find((s) => s.name === 'Anal');
    expect(anal).toBeDefined();
    expect(anal!.included).toBe(true);
    expect(anal!.extra).toBe(false);
  });

  it('extracts services with notes', () => {
    const withNote = payload.services.find((s) => s.note);
    expect(withNote).toBeDefined();
    expect(withNote!.note).toBeTruthy();
  });

  it('reviews are empty (no reviews in fixture)', () => {
    expect(payload.reviews).toHaveLength(0);
  });
});

// ============================================================================
// Synthetic HTML — minimal profile
// ============================================================================
describe('extractEuroGirlsEscort — synthetic minimal HTML', () => {
  const minimalHtml = `
    <html><head>
      <link rel="canonical" href="https://www.eurogirlsescort.com/escort/test/42/" />
    </head><body>
      <div class="description"><h1>Ana, escort</h1></div>
      <div id="js-gallery"></div>
      <div class="params">
        <div><span>Age:</span><strong>25</strong></div>
        <div><span>Gender:</span><strong>Female</strong></div>
      </div>
      <div class="contacts"><div id="js-phone"></div></div>
      <div class="working-time"></div>
      <div class="rates"><table><tbody></tbody></table></div>
      <div class="services"><table><tbody></tbody></table></div>
      <div class="reviews"></div>
    </body></html>
  `;

  const payload = extractEuroGirlsEscort(minimalHtml);

  it('extracts sourceId from canonical URL', () => {
    expect(payload.sourceId).toBe('42');
  });

  it('strips suffix from nickname', () => {
    expect(payload.nickname).toBe('Ana');
  });

  it('extracts age', () => {
    expect(payload.params.age).toBe('25');
  });

  it('returns empty arrays for missing sections', () => {
    expect(payload.photos).toHaveLength(0);
    expect(payload.phones).toHaveLength(0);
    expect(payload.rates).toHaveLength(0);
    expect(payload.services).toHaveLength(0);
    expect(payload.reviews).toHaveLength(0);
  });
});
