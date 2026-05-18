import { describe, expect, it } from 'vitest';
import { extractMislios } from '#infrastructure/adapters/sources/dating/mislios/mislios.extractor.js';
import { mapMislios, MISLIOS_SOURCE } from '#infrastructure/adapters/sources/dating/mislios/mislios.mapper.js';
import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://mislios.com/anuncios/ana-escort-madrid/';
const NOW = new Date('2026-01-01T00:00:00.000Z');

describe('mislios pipeline — HTML → ScrapedProvider', () => {
  it('extract + map produces valid ScrapedProvider', async () => {
    const html = loadHtml('ana_escort-madrid.html');
    const payload = extractMislios(html, SOURCE_URL);
    const sp = await mapMislios(payload, new FakeTaxonomyResolver(), { now: NOW });

    expect(sp.id).toContain(MISLIOS_SOURCE);
    expect(sp.nickname).toBe('Ana');
    expect(sp.phoneNumber).toBe('622345678');
    expect(sp.contactOptions).toContain('calls');
    expect(sp.photos).toHaveLength(3);
    expect(sp.externalRefs[0]?.source).toBe(MISLIOS_SOURCE);
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });
});
