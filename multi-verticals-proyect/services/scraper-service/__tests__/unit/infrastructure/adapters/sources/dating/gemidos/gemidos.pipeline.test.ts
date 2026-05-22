import { describe, expect, it } from 'vitest';

import { extractGemidos } from '#infrastructure/adapters/sources/dating/gemidos/gemidos.extractor.js';
import {
  GEMIDOS_SOURCE,
  mapGemidos,
} from '#infrastructure/adapters/sources/dating/gemidos/gemidos.mapper.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://gemidos.tv/anuncio/lucia-escort-madrid/';
const NOW = new Date('2026-01-01T00:00:00.000Z');

describe('gemidos pipeline — HTML → ScrapedProvider', () => {
  it('extract + map produces valid ScrapedProvider', async () => {
    const html = loadHtml('lucia_escort-madrid.html');
    const payload = extractGemidos(html, SOURCE_URL);
    const sp = await mapGemidos(payload, new FakeTaxonomyResolver(), { now: NOW });

    expect(sp.id).toContain(GEMIDOS_SOURCE);
    expect(sp.nickname).toBe('Lucia');
    expect(sp.phoneNumber).toBe('633445566');
    expect(sp.contactOptions).toContain('calls');
    expect(sp.photos).toHaveLength(2);
    expect(sp.badges.verified).toBe(true);
    expect(sp.personalDetails.ageYears).toBe(26);
    expect(sp.externalRefs[0]?.source).toBe(GEMIDOS_SOURCE);
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });
});
