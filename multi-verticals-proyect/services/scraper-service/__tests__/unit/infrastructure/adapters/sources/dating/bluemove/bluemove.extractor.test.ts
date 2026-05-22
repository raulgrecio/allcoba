import { beforeAll, describe, expect, it } from 'vitest';

import type { BluemovePayload } from '#infrastructure/adapters/sources/dating/bluemove/bluemove.types.js';
import { extractBluemove } from '#infrastructure/adapters/sources/dating/bluemove/bluemove.extractor.js';

import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://bluemove.es/madrid/escorts/#56636';

describe('extractBluemove — fixture andreia_56636 (modal real)', () => {
  let payload: BluemovePayload;

  beforeAll(() => {
    const html = loadHtml('andreia_56636.html');
    payload = extractBluemove(html, SOURCE_URL);
  });

  it('sourceId = 56636', () => expect(payload.sourceId).toBe('56636'));
  it('sourceUrl', () => expect(payload.sourceUrl).toBe(SOURCE_URL));
  it('nickname = Andreia', () => expect(payload.nickname).toBe('Andreia'));
  it('title from quote', () => expect(payload.title).toBe('Linda y cariñosa'));
  it('bio extracted', () => expect(payload.bio).toContain('Andreia'));

  it('phone from em-profile-phone', () => expect(payload.phone).toBe('603841323'));
  it('whatsapp from em-cta-whatsapp', () => expect(payload.whatsappPhone).toBe('603841323'));
  it('telegram from em-cta-telegram', () => expect(payload.telegram).toBe('+603841323'));

  it('photos extracted', () => expect(payload.photos.length).toBeGreaterThan(3));
  it('photo src is bluemove CDN', () =>
    expect(payload.photos[0]!.src).toContain('media3.bluemove.es'));
  it('isVerified = false (breakdown sin identity/selfie)', () =>
    expect(payload.isVerified).toBe(false));

  it('age = 28', () => expect(payload.params.age).toBe(28));
  it('nationality = Portuguesa', () => expect(payload.params.nationality).toBe('Portuguesa'));
  it('languages', () =>
    expect(payload.params.languages).toEqual(['Español', 'Inglés', 'Portugués']));
  it('city = Madrid (province stripped)', () => expect(payload.params.city).toBe('Madrid'));
  it('zone = Tetuán', () => expect(payload.params.zone).toBe('Tetuán'));
  it('services include Girlfriend experience', () =>
    expect(payload.params.services).toContain('Girlfriend experience'));
  it('serviceLocations extracted', () =>
    expect(payload.params.serviceLocations!.length).toBeGreaterThan(0));
  it('paymentMethods extracted', () =>
    expect(payload.params.paymentMethods!.length).toBeGreaterThan(0));
});

describe('extractBluemove — em-profile-highlight fallback', () => {
  it('deriva age + nationality del highlight cuando no hay em-stat-row', () => {
    const html = `<html><body><escort-modal>
      <h2 class="em-profile-name">Sofia</h2>
      <p class="em-profile-highlight">Española · 31 anos</p>
    </escort-modal></body></html>`;
    const p = extractBluemove(html, 'https://bluemove.es/madrid/escorts/#1234');
    expect(p.params.age).toBe(31);
    expect(p.params.nationality).toBe('Española');
  });
});

describe('extractBluemove — og:image fallback', () => {
  it('usa og:image cuando no hay em-photo-tile', () => {
    const html = `<html><head>
      <meta property="og:image" content="https://media3.bluemove.es/og.jpg">
    </head><body><escort-modal></escort-modal></body></html>`;
    const p = extractBluemove(html, 'https://bluemove.es/barcelona/escorts/#99999');
    expect(p.photos).toHaveLength(1);
    expect(p.photos[0]!.src).toContain('og.jpg');
  });
});

describe('extractBluemove — city from URL fallback', () => {
  it('usa la ciudad de la URL cuando no hay em-stat-row Ciudad', () => {
    const html = '<html><body><escort-modal></escort-modal></body></html>';
    const p = extractBluemove(html, 'https://bluemove.es/valencia/escorts/#1111');
    expect(p.params.city).toBe('valencia');
  });
});

describe('extractBluemove — minimal HTML', () => {
  it('maneja datos ausentes sin romper', () => {
    const html = '<html><body><escort-modal></escort-modal></body></html>';
    const p = extractBluemove(html, 'https://bluemove.es/madrid/escorts/#5555');
    expect(p.sourceId).toBe('5555');
    expect(p.nickname).toBeUndefined();
    expect(p.phone).toBeUndefined();
    expect(p.isVerified).toBe(false);
    expect(p.params.age).toBeUndefined();
    expect(p.params.services).toBeUndefined();
  });
});
