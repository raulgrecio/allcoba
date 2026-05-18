import { describe, expect, it } from 'vitest';
import { extractChicasmalas } from '#infrastructure/adapters/sources/dating/chicasmalas/chicasmalas.extractor.js';
import {
  mapChicasmalas,
  CHICASMALAS_SOURCE,
} from '#infrastructure/adapters/sources/dating/chicasmalas/chicasmalas.mapper.js';
import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL =
  'https://www.chicasmalas.es/maria-escort-espanola-en-orihuela-697394223/';
const NOW = new Date('2026-01-01T00:00:00.000Z');

describe('chicasmalas pipeline — Playwright HTML → ScrapedProvider', () => {
  it('extract + map produces valid ScrapedProvider', async () => {
    const html = loadHtml('maria_697394223.html');
    const payload = extractChicasmalas(html, SOURCE_URL);
    const sp = await mapChicasmalas(payload, new FakeTaxonomyResolver(), { now: NOW });

    expect(sp.id).toContain(CHICASMALAS_SOURCE);
    expect(sp.nickname).toBe('María');
    expect(sp.phoneNumber).toBe('697394223');
    expect(sp.contactOptions).toContain('calls');
    expect(sp.photos.length).toBeGreaterThan(0);
    expect(sp.externalRefs[0]?.source).toBe(CHICASMALAS_SOURCE);
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });
});
