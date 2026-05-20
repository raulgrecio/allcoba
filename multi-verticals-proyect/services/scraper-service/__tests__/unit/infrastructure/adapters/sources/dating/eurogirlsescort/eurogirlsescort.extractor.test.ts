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
// Params — all labels with empty strong text
// ============================================================================
describe('extractEuroGirlsEscort — params: all-empty text fallbacks', () => {
  const html = `<html><head>
    <link rel="canonical" href="https://www.eurogirlsescort.com/escort/test/99/" />
  </head><body>
    <div class="params">
      <div><span>gender:</span><strong></strong></div>
      <div><span>age:</span><strong></strong></div>
      <div><span>location:</span><strong><a></a><a href="/"> </a></strong></div>
      <div><span>city part:</span><strong><a></a></strong></div>
      <div><span>eyes:</span><strong></strong></div>
      <div><span>hair color:</span><strong></strong></div>
      <div><span>hair lenght:</span><strong></strong></div>
      <div><span>hair length:</span><strong></strong></div>
      <div><span>pubic hair:</span><strong></strong></div>
      <div><span>bust size:</span><strong></strong></div>
      <div><span>bust type:</span><strong></strong></div>
      <div><span>travel:</span><strong></strong></div>
      <div><span>weight:</span><strong></strong></div>
      <div><span>height:</span><strong></strong></div>
      <div><span>ethnicity:</span><strong></strong></div>
      <div><span>orientation:</span><strong></strong></div>
      <div><span>smoker:</span><strong></strong></div>
      <div><span>tattoo:</span><strong></strong></div>
      <div><span>piercing:</span><strong></strong></div>
      <div><span>nationality:</span><strong></strong></div>
      <div><span>services:</span><strong></strong></div>
      <div><span>available for:</span><strong></strong></div>
      <div><span>meeting with:</span><strong></strong></div>
    </div>
  </body></html>`;

  const p = extractEuroGirlsEscort(html);

  it('gender undefined (empty strong text)', () => expect(p.params.gender).toBeUndefined());
  it('age undefined (empty strong text)', () => expect(p.params.age).toBeUndefined());
  it('locationCityName undefined (empty link text)', () => expect(p.params.locationCityName).toBeUndefined());
  it('locationCitySlug undefined (link has no href)', () => expect(p.params.locationCitySlug).toBeUndefined());
  it('locationCountryName undefined (2nd link text empty)', () => expect(p.params.locationCountryName).toBeUndefined());
  it('locationCountrySlug undefined (href="/" → empty segments)', () => expect(p.params.locationCountrySlug).toBeUndefined());
  it('cityPart undefined (link text empty, no tooltip text)', () => expect(p.params.cityPart).toBeUndefined());
  it('eyes undefined', () => expect(p.params.eyes).toBeUndefined());
  it('hairColor undefined', () => expect(p.params.hairColor).toBeUndefined());
  it('hairLength undefined (both lenght and length variants)', () => expect(p.params.hairLength).toBeUndefined());
  it('pubicHair undefined', () => expect(p.params.pubicHair).toBeUndefined());
  it('bustSize undefined', () => expect(p.params.bustSize).toBeUndefined());
  it('bustType undefined', () => expect(p.params.bustType).toBeUndefined());
  it('travel undefined', () => expect(p.params.travel).toBeUndefined());
  it('weight undefined', () => expect(p.params.weight).toBeUndefined());
  it('height undefined', () => expect(p.params.height).toBeUndefined());
  it('ethnicity undefined', () => expect(p.params.ethnicity).toBeUndefined());
  it('orientation undefined', () => expect(p.params.orientation).toBeUndefined());
  it('smoker undefined', () => expect(p.params.smoker).toBeUndefined());
  it('tattoo undefined', () => expect(p.params.tattoo).toBeUndefined());
  it('piercing undefined', () => expect(p.params.piercing).toBeUndefined());
  it('nationality undefined', () => expect(p.params.nationality).toBeUndefined());
  it('servicesText undefined (both js-more and plain text empty)', () => expect(p.params.servicesText).toBeUndefined());
  it('availableFor undefined', () => expect(p.params.availableFor).toBeUndefined());
  it('meetingWith undefined', () => expect(p.params.meetingWith).toBeUndefined());
});

// ============================================================================
// Edge cases — badges, phones, photos, map, rates, reviews
// ============================================================================
describe('extractEuroGirlsEscort — edge case branches', () => {
  it('badge with no badge-xxx class + empty label is skipped (L88 ?? unknown, L91 false)', () => {
    const html = `<html><body>
      <div class="badges">
        <span class="badge">Has Label</span>
        <span class="badge"></span>
      </div>
    </body></html>`;
    const p = extractEuroGirlsEscort(html);
    expect(p.badges).toHaveLength(1);
    expect(p.badges[0]!.type).toBe('unknown');
    expect(p.badges[0]!.label).toBe('Has Label');
  });

  it('phone item with no tel: link is skipped (L180 if-true = return)', () => {
    const html = `<html><body>
      <div id="js-phone">
        <div class="js-phone-item"><span>no tel link here</span></div>
      </div>
    </body></html>`;
    const p = extractEuroGirlsEscort(html);
    expect(p.phones).toHaveLength(0);
  });

  it('phone without data-id / data-phone / flag spreads empty objects (L186, L195, L196, L198)', () => {
    const html = `<html><body>
      <div id="js-phone">
        <div class="js-phone-item">
          <a class="js-phone" href="tel:+34600111222">+34600111222</a>
        </div>
      </div>
    </body></html>`;
    const p = extractEuroGirlsEscort(html);
    expect(p.phones).toHaveLength(1);
    expect(p.phones[0]!.dataId).toBeUndefined();
    expect(p.phones[0]!.dataPhone).toBeUndefined();
    expect(p.phones[0]!.flagCountryCode).toBeUndefined();
  });

  it('photo without title attr falls back to empty string (L217)', () => {
    const html = `<html><body>
      <div id="js-gallery">
        <a class="js-gallery" href="https://eurogirlsescort.com/photo.jpg">no title attr</a>
      </div>
    </body></html>`;
    const p = extractEuroGirlsEscort(html);
    expect(p.photos).toHaveLength(1);
    expect(p.photos[0]!.title).toBe('');
  });

  it('#incall-map with no data attrs returns undefined (L231-233 ?? fallbacks, L234 NaN check)', () => {
    const html = `<html><body>
      <div id="incall-map"></div>
    </body></html>`;
    const p = extractEuroGirlsEscort(html);
    expect(p.mapData).toBeUndefined();
  });

  it('rate row with empty duration is skipped (L259)', () => {
    const html = `<html><body>
      <div class="rates"><table><tbody>
        <tr><th></th><td>500 MYR</td><td>800 MYR</td></tr>
      </tbody></table></div>
    </body></html>`;
    const p = extractEuroGirlsEscort(html);
    expect(p.rates).toHaveLength(0);
  });

  it('rate cells with icon-close return {} → incall/outcall amounts absent (L262, L301, L306)', () => {
    const html = `<html><body>
      <div class="rates"><table><tbody>
        <tr>
          <th>1 Hour</th>
          <td><i class="icon-close"></i></td>
          <td><i class="icon-close"></i></td>
        </tr>
      </tbody></table></div>
    </body></html>`;
    const p = extractEuroGirlsEscort(html);
    expect(p.rates).toHaveLength(1);
    expect(p.rates[0]!.incallAmount).toBeUndefined();
    expect(p.rates[0]!.outcallAmount).toBeUndefined();
  });

  it('rate cell with unparseable main text returns {} (L280)', () => {
    const html = `<html><body>
      <div class="rates"><table><tbody>
        <tr>
          <th>2 Hours</th>
          <td>not-a-price</td>
          <td>800 MYR</td>
        </tr>
      </tbody></table></div>
    </body></html>`;
    const p = extractEuroGirlsEscort(html);
    expect(p.rates).toHaveLength(1);
    expect(p.rates[0]!.incallAmount).toBeUndefined();
    expect(p.rates[0]!.outcallAmount).toBe(800);
  });

  it('rate cell without EUR small: eurAmount undefined (L283, L288, L300, L305)', () => {
    const html = `<html><body>
      <div class="rates"><table><tbody>
        <tr>
          <th>30 min</th>
          <td>500 MYR</td>
          <td>800 MYR</td>
        </tr>
      </tbody></table></div>
    </body></html>`;
    const p = extractEuroGirlsEscort(html);
    expect(p.rates).toHaveLength(1);
    expect(p.rates[0]!.incallAmount).toBe(500);
    expect(p.rates[0]!.incallEurAmount).toBeUndefined();
    expect(p.rates[0]!.outcallAmount).toBe(800);
    expect(p.rates[0]!.outcallEurAmount).toBeUndefined();
  });

  it('review item without author is skipped (L325)', () => {
    const html = `<html><body>
      <div class="reviews">
        <div id="reviews-content">
          <div class="item"><h3><span>2025-01-01</span></h3><div class="more-text">Great!</div></div>
        </div>
      </div>
    </body></html>`;
    const p = extractEuroGirlsEscort(html);
    expect(p.reviews).toHaveLength(0);
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
