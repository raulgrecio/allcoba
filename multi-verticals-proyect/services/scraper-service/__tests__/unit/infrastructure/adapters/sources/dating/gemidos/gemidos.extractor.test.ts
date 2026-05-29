import { beforeAll, describe, expect, it } from 'vitest';

import type { GemidosPayload } from '#infrastructure/adapters/sources/dating/gemidos/gemidos.types.js';
import { extractGemidos } from '#infrastructure/adapters/sources/dating/gemidos/gemidos.extractor.js';

import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://gemidos.tv/anuncio/lucia-escort-madrid/';

describe('extractGemidos — fixture lucia_escort-madrid', () => {
  let payload: GemidosPayload;

  beforeAll(() => {
    const html = loadHtml('lucia_escort-madrid.html');
    payload = extractGemidos(html, SOURCE_URL);
  });

  it('sourceId = lucia-escort-madrid', () => expect(payload.sourceId).toBe('lucia-escort-madrid'));
  it('sourceUrl', () => expect(payload.sourceUrl).toBe(SOURCE_URL));
  it('title extracted from .pub-title', () => expect(payload.title).toContain('Lucia'));
  it('nickname = Lucia (emoji stripped)', () => expect(payload.nickname).toBe('Lucia'));
  it('bio extracted', () => expect(payload.bio).toContain('independiente'));

  it('phone from .pub-phone span', () => expect(payload.phone).toBe('633445566'));

  it('2 gallery photos', () => expect(payload.photos).toHaveLength(2));
  it('isVerified = true', () => expect(payload.isVerified).toBe(true));

  it('age = 26', () => expect(payload.params.age).toBe(26));
  it('heightCm = 165', () => expect(payload.params.heightCm).toBe(165));
  it('weightKg = 52', () => expect(payload.params.weightKg).toBe(52));
  it('measurements = 90-60-90', () => expect(payload.params.measurements).toBe('90-60-90'));
  it('nationality = Colombiana', () => expect(payload.params.nationality).toBe('Colombiana'));
  it('ethnicity = Morena', () => expect(payload.params.ethnicity).toBe('Morena'));
  it('services extracted', () => {
    const labels = payload.params.services?.map((s) => s.label) ?? [];
    expect(labels).toContain('GFE');
    expect(labels.length).toBeGreaterThan(0);
  });
});

describe('extractGemidos — og:image fallback', () => {
  it('uses og:image when no gallery', () => {
    const html = `<html><head>
      <meta property="og:image" content="https://cdn.gemidos.tv/og.jpg">
    </head><body><h1 class="pub-title">Sofia</h1></body></html>`;
    const p = extractGemidos(html, 'https://gemidos.tv/anuncio/sofia/');
    expect(p.photos).toHaveLength(1);
    expect(p.photos[0]!.src).toContain('og.jpg');
  });
});

describe('extractGemidos — minimal HTML', () => {
  it('handles missing data gracefully', () => {
    const html = '<html><body><h1 class="pub-title">Mia</h1></body></html>';
    const p = extractGemidos(html, 'https://gemidos.tv/anuncio/mia/');
    expect(p.sourceId).toBe('mia');
    expect(p.phone).toBeUndefined();
    expect(p.whatsapp).toBeUndefined();
    expect(p.isVerified).toBe(false);
    expect(p.params.age).toBeUndefined();
    expect(p.params.services).toBeUndefined();
    expect(p.params.workingHours).toBeUndefined();
  });
});

describe('extractGemidos — whatsapp and working hours', () => {
  it('extracts whatsapp from data-whatsapp-phone', () => {
    const html = `<html><body>
      <h1 class="pub-title">Ana</h1>
      <div class="pub-menu">
        <button data-trigger="Whatsapp.send" data-whatsapp-phone="34612345678"></button>
      </div>
    </body></html>`;
    const p = extractGemidos(html, 'https://gemidos.tv/anuncio/ana/');
    expect(p.whatsapp).toBe('34612345678');
  });

  it('extracts workingHours from .pub-hours-time', () => {
    const html = `<html><body>
      <h1 class="pub-title">Ana</h1>
      <div class="pub-hours"><div class="pub-hours-time">FULL TIME</div></div>
    </body></html>`;
    const p = extractGemidos(html, 'https://gemidos.tv/anuncio/ana/');
    expect(p.params.workingHours).toBe('FULL TIME');
  });
});

describe('extractGemidos — service artifact filter', () => {
  it('filters out broken oral- link with single-char label', () => {
    const html = `<html><body>
      <h1 class="pub-title">Ana</h1>
      <div class="pub-services">
        <a href="oral-69" class="pub-tags-item pub_services_oral">69</a>
        <a href="oral-" class="pub-tags-item pub_services_oral">i</a>
      </div>
    </body></html>`;
    const p = extractGemidos(html, 'https://gemidos.tv/anuncio/ana/');
    const slugs = p.params.services?.map((s) => s.slug) ?? [];
    expect(slugs).toContain('oral-69');
    expect(slugs).not.toContain('oral-');
  });
});

describe('extractGemidos — additional branch coverage', () => {
  it('handles getTagValue early returns and empty text content', () => {
    const html = `<html><body>
      <h1 class="pub-title">Ana</h1>
      <span class="pub-tags-item"><small>Nacionalidad</small>Colombiana</span>
      <span class="pub-tags-item"><small>Nacionalidad</small>Venezolana</span>
      <span class="pub-tags-item"><small>Piel</small></span>
    </body></html>`;
    const p = extractGemidos(html, 'https://gemidos.tv/anuncio/ana/');
    expect(p.params.nationality).toBe('Colombiana');
    expect(p.params.ethnicity).toBeUndefined();
  });

  it('handles empty services, missing classes, falsy location tags, and break statement in address strong loop', () => {
    const html = `<html><body>
      <h1 class="pub-title">Ana</h1>
      <div class="pub-services">
        <a class="pub-tags-item"></a>
        <a class="pub-tags-item" href="test-service">Valid Label</a>
      </div>
      <div class="pub-location"><span class="pub-location-tag"></span></div>
      <div class="pub-map-label">
        <strong></strong>
        <strong>Madrid, Spain</strong>
        <strong>Barcelona</strong>
      </div>
    </body></html>`;
    const p = extractGemidos(html, 'https://gemidos.tv/anuncio/ana/');
    expect(p.params.services).toBeDefined();
    expect(p.params.services![0]?.label).toBe('Valid Label');
    expect(p.params.services![0]?.category).toBe('services');
    expect(p.params.locationTags).toBeUndefined();
    expect(p.params.address).toBe('Madrid, Spain');
  });
});


