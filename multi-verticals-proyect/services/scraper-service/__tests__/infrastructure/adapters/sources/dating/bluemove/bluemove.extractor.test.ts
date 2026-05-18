import { describe, expect, it, beforeAll } from 'vitest';
import { extractBluemove } from '#infrastructure/adapters/sources/dating/bluemove/bluemove.extractor.js';
import type { BluemovePayload } from '#infrastructure/adapters/sources/dating/bluemove/bluemove.types.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://bluemove.es/madrid/escorts/#49049';

describe('extractBluemove — fixture beatriz_49049', () => {
  let payload: BluemovePayload;

  beforeAll(() => {
    const html = loadHtml('beatriz_49049.html');
    payload = extractBluemove(html, SOURCE_URL);
  });

  it('sourceId = 49049', () => expect(payload.sourceId).toBe('49049'));
  it('sourceUrl', () => expect(payload.sourceUrl).toBe(SOURCE_URL));
  it('title from img alt', () => expect(payload.title).toContain('BEATRIZ'));
  it('nickname = Beatriz', () => expect(payload.nickname).toBe('Beatriz'));
  it('bio extracted', () => expect(payload.bio).toContain('independiente'));

  it('phone from #phoneCallSection', () => expect(payload.phone).toBe('678797126'));
  it('whatsapp from #phoneCallSection', () => expect(payload.whatsappPhone).toBe('678797126'));
  it('telegram from #phoneCallSection', () => expect(payload.telegram).toBe('beatriz_escort'));
  it('instagram from .ficha-social-media', () => expect(payload.instagram).toBe('beatriz_escort_madrid'));

  it('2 gallery photos', () => expect(payload.photos).toHaveLength(2));
  it('isVerified = true (verificada badge)', () => expect(payload.isVerified).toBe(true));

  it('age = 27', () => expect(payload.params.age).toBe(27));
  it('city = Madrid (province stripped)', () => expect(payload.params.city).toBe('Madrid'));
  it('heightCm = 168', () => expect(payload.params.heightCm).toBe(168));
  it('weightKg = 58', () => expect(payload.params.weightKg).toBe(58));
  it('hairColor = Rubia', () => expect(payload.params.hairColor).toBe('Rubia'));
  it('eyeColor = Verdes', () => expect(payload.params.eyeColor).toBe('Verdes'));
  it('nationality = Española', () => expect(payload.params.nationality).toBe('Española'));
  it('languages = [Español, Inglés]', () => expect(payload.params.languages).toEqual(['Español', 'Inglés']));
  it('tattoos = false', () => expect(payload.params.tattoos).toBe(false));
  it('piercings = true', () => expect(payload.params.piercings).toBe(true));
  it('zone = Centro', () => expect(payload.params.zone).toBe('Centro'));
  it('services extracted', () => expect(payload.params.services).toContain('GFE'));
});

describe('extractBluemove — og:image fallback', () => {
  it('uses og:image when no slider', () => {
    const html = `<html><head>
      <meta property="og:image" content="https://cdn.bluemove.es/og.jpg">
    </head><body><div id="fichaContent"></div></body></html>`;
    const p = extractBluemove(html, 'https://bluemove.es/barcelona/escorts/#99999');
    expect(p.photos).toHaveLength(1);
    expect(p.photos[0]!.src).toContain('og.jpg');
  });
});

describe('extractBluemove — city from URL fallback', () => {
  it('falls back to URL city when no data-row', () => {
    const html = '<html><body><div id="fichaContent"></div></body></html>';
    const p = extractBluemove(html, 'https://bluemove.es/valencia/escorts/#1111');
    expect(p.params.city).toBe('valencia');
  });
});

describe('extractBluemove — minimal HTML', () => {
  it('handles missing data gracefully', () => {
    const html = '<html><body><div id="fichaContent"></div></body></html>';
    const p = extractBluemove(html, 'https://bluemove.es/madrid/escorts/#5555');
    expect(p.sourceId).toBe('5555');
    expect(p.phone).toBeUndefined();
    expect(p.isVerified).toBe(false);
    expect(p.params.age).toBeUndefined();
    expect(p.params.services).toBeUndefined();
  });
});
