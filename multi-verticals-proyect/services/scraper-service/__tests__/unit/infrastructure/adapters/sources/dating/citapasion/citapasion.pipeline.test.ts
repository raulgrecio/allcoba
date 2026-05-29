import { describe, expect, it } from 'vitest';

import { extractCitapasion } from '#infrastructure/adapters/sources/dating/citapasion/citapasion.extractor.js';
import {
  CITAPASION_SOURCE,
  mapCitapasion,
} from '#infrastructure/adapters/sources/dating/citapasion/citapasion.mapper.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://citapasion.com/escorts/17533';
const NOW = new Date('2026-01-01T00:00:00.000Z');

describe('citapasion pipeline — HTML → ScrapedProvider', () => {
  it('extract + map produces valid ScrapedProvider', async () => {
    const html = loadHtml('sofia_17533.html');
    const payload = extractCitapasion(html, SOURCE_URL);
    const sp = await mapCitapasion(payload, new FakeTaxonomyResolver(), { now: NOW });

    expect(sp.id).toContain(CITAPASION_SOURCE);
    expect(sp.nickname).toBe('Sofia');
    expect(sp.phoneNumber).toBe('644556677');
    expect(sp.contactOptions).toContain('calls');
    expect(sp.contactOptions).toContain('whatsapp');
    expect(sp.photos).toHaveLength(2);
    expect(sp.baseCity?.id).toBe('city:madrid');
    expect(sp.personalDetails.ageYears).toBe(28);
    expect(sp.reviewsEnabled).toBe(true);
    expect(sp.reviewsRating).toBe(4.5);
    expect(sp.externalRefs[0]?.source).toBe(CITAPASION_SOURCE);
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });
});
