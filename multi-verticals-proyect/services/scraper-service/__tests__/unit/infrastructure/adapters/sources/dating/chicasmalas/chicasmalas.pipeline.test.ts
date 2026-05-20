import { describe, expect, it } from 'vitest';
import { extractChicasmalas } from '#infrastructure/adapters/sources/dating/chicasmalas/chicasmalas.extractor.js';
import {
  mapChicasmalas,
  CHICASMALAS_SOURCE,
} from '#infrastructure/adapters/sources/dating/chicasmalas/chicasmalas.mapper.js';
import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://www.chicasmalas.es/anuncios/sofia-deluxe/';
const NOW = new Date('2026-01-01T00:00:00.000Z');

describe('chicasmalas pipeline — Elementor HTML → ScrapedProvider', () => {
  it('extract + map produces valid ScrapedProvider', async () => {
    const html = loadHtml('sofia-deluxe.html');
    const payload = extractChicasmalas(html, SOURCE_URL);
    const sp = await mapChicasmalas(payload, new FakeTaxonomyResolver(), { now: NOW });

    expect(sp.id).toContain(CHICASMALAS_SOURCE);
    expect(sp.nickname).toBeTruthy();
    expect(sp.contactOptions).toContain('whatsapp');
    expect(sp.photos.length).toBeGreaterThan(0);
    expect(sp.personalDetails.ageYears).toBe(22);
    expect(sp.personalDetails.heightCm).toBe(168);
    expect(sp.aboutMe?.original).toBeTruthy();
    expect(sp.externalRefs[0]?.source).toBe(CHICASMALAS_SOURCE);
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });
});
