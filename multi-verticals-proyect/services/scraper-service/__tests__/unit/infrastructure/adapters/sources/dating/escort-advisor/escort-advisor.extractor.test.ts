import { beforeAll, describe, expect, it } from 'vitest';

import type { EscortAdvisorPayload } from '#infrastructure/adapters/sources/dating/escort-advisor/escort-advisor.types.js';
import { extractEscortAdvisor } from '#infrastructure/adapters/sources/dating/escort-advisor/escort-advisor.extractor.js';

import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://www.escort-advisor.xxx/escorts/spain/madrid/diana-667554247/';

describe('extractEscortAdvisor — fixture diana_667554247', () => {
  let payload: EscortAdvisorPayload;

  beforeAll(() => {
    const html = loadHtml('diana_667554247.html');
    payload = extractEscortAdvisor(html, SOURCE_URL);
  });

  it('sourceId = 667554247 (numeric from slug)', () => expect(payload.sourceId).toBe('667554247'));
  it('sourceUrl', () => expect(payload.sourceUrl).toBe(SOURCE_URL));
  it('title = Diana', () => expect(payload.title).toBe('Diana'));
  it('nickname = Diana', () => expect(payload.nickname).toBe('Diana'));
  it('bio extracted', () => expect(payload.bio).toContain('independiente'));

  it('phone from a[href^="tel:"]', () => expect(payload.phone).toBe('655447788'));

  it('2 gallery photos', () => expect(payload.photos).toHaveLength(2));
  it('isVerified = true', () => expect(payload.isVerified).toBe(true));

  it('age = 29', () => expect(payload.params.age).toBe(29));
  it('heightCm = 170', () => expect(payload.params.heightCm).toBe(170));
  it('weightKg = 57', () => expect(payload.params.weightKg).toBe(57));
  it('nationality = Venezolana', () => expect(payload.params.nationality).toBe('Venezolana'));
  it('ethnicity = Latina', () => expect(payload.params.ethnicity).toBe('Latina'));
  it('services extracted', () => {
    expect(payload.params.services).toContain('GFE');
    expect(payload.params.services).toContain('Masaje tántrico');
  });
});

describe('extractEscortAdvisor — og:image fallback', () => {
  it('uses og:image when no gallery', () => {
    const html = `<html><head>
      <meta property="og:image" content="https://cdn.escort-advisor.xxx/og.jpg">
    </head><body><div class="username"><h2>Sofia</h2></div></body></html>`;
    const p = extractEscortAdvisor(
      html,
      'https://www.escort-advisor.xxx/escorts/spain/madrid/sofia-99999/',
    );
    expect(p.photos).toHaveLength(1);
    expect(p.photos[0]!.src).toContain('og.jpg');
  });
});

describe('extractEscortAdvisor — minimal HTML', () => {
  it('handles missing data gracefully', () => {
    const html = '<html><body><div class="username"><h2>Mia</h2></div></body></html>';
    const p = extractEscortAdvisor(
      html,
      'https://www.escort-advisor.xxx/escorts/spain/madrid/mia-11111/',
    );
    expect(p.sourceId).toBe('11111');
    expect(p.phone).toBeUndefined();
    expect(p.whatsapp).toBeUndefined();
    expect(p.isVerified).toBe(false);
    expect(p.params.age).toBeUndefined();
    expect(p.reviewsRating).toBeUndefined();
    expect(p.reviewsCount).toBeUndefined();
  });
});

describe('extractEscortAdvisor — whatsapp, rating, and personal-info fields', () => {
  const html = `<html><body>
    <div class="username"><h2>Ana</h2></div>
    <a href="tel:+34612345678">Llamar</a>
    <div class="btn btn-whatsapp" onclick="whatsApp(+34612345678, 'Ana', 'es', 999, 'Profile', 1)"></div>
    <div class="pdp_rating_component"><div class="tx">4,50</div></div>
    <div class="col-xs-12 review when-closed"></div>
    <div class="col-xs-12 review when-closed"></div>
    <div class="personal-info">
      <ul class="info-list">
        <li><b>Ciudad:</b>Barcelona</li>
        <li><b>Precio:</b>€€ de 100 a 200 euro</li>
        <li><b>Recibo:</b>A mi casa Hotel</li>
        <li><b>Figura:</b>Delgada</li>
        <li><b>Ojos:</b>Verdes</li>
        <li><b>Cabellos:</b>Rubia largo</li>
      </ul>
    </div>
  </body></html>`;

  let p: EscortAdvisorPayload;
  beforeAll(() => {
    p = extractEscortAdvisor(html, 'https://www.escort-advisor.xxx/escorts/spain/barcelona/ana-999/');
  });

  it('whatsapp from onclick', () => expect(p.whatsapp).toBe('+34612345678'));
  it('reviewsRating parsed from comma decimal', () => expect(p.reviewsRating).toBe(4.5));
  it('reviewsCount from .review.when-closed', () => expect(p.reviewsCount).toBe(2));
  it('city from personal-info', () => expect(p.params.city).toBe('Barcelona'));
  it('priceText from personal-info', () => expect(p.params.priceText).toContain('100'));
  it('meetingRaw from personal-info', () => expect(p.params.meetingRaw).toContain('Hotel'));
  it('bodyType from personal-info', () => expect(p.params.bodyType).toBe('Delgada'));
  it('eyeColor from personal-info', () => expect(p.params.eyeColor).toBe('Verdes'));
  it('hairColor from personal-info', () => expect(p.params.hairColor).toBe('Rubia largo'));
});
