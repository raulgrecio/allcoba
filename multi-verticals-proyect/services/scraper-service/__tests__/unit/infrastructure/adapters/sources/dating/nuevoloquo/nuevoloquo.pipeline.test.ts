import { describe, expect, it } from 'vitest';

import { extractNuevoloquo } from '#infrastructure/adapters/sources/dating/nuevoloquo/nuevoloquo.extractor.js';
import {
  mapNuevoloquo,
  NUEVOLOQUO_SOURCE,
} from '#infrastructure/adapters/sources/dating/nuevoloquo/nuevoloquo.mapper.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://nuevoloquo.es/escort/madrid/ana-martinez/67890/';
const NOW = new Date('2026-01-01T00:00:00.000Z');

describe('nuevoloquo pipeline — HTML → ScrapedProvider', () => {
  it('extract + map produces valid ScrapedProvider', async () => {
    const html = loadHtml('ana_67890.html');
    const payload = extractNuevoloquo(html, SOURCE_URL);
    const sp = await mapNuevoloquo(payload, new FakeTaxonomyResolver(), { now: NOW });

    expect(sp.id).toContain(NUEVOLOQUO_SOURCE);
    expect(sp.nickname).toContain('Ana');
    expect(sp.baseCity?.id).toContain('madrid');
    expect(sp.photos).toHaveLength(3);
    expect(sp.personalDetails.ageYears).toBe(27);
    expect(sp.personalDetails.heightCm).toBe(165);
    expect(sp.personalDetails.ethnicId).toContain('latina');
    expect(sp.badges.verified).toBe(true);
    expect(sp.externalRefs[0]?.source).toBe(NUEVOLOQUO_SOURCE);
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });
});
