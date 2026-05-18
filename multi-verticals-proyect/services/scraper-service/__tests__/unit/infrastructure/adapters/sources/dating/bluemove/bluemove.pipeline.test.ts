import { describe, expect, it } from 'vitest';
import { extractBluemove } from '#infrastructure/adapters/sources/dating/bluemove/bluemove.extractor.js';
import { mapBluemove, BLUEMOVE_SOURCE } from '#infrastructure/adapters/sources/dating/bluemove/bluemove.mapper.js';
import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://bluemove.es/madrid/escorts/#49049';
const NOW = new Date('2026-01-01T00:00:00.000Z');

describe('bluemove pipeline — HTML → ScrapedProvider', () => {
  it('extract + map produces valid ScrapedProvider', async () => {
    const html = loadHtml('beatriz_49049.html');
    const payload = extractBluemove(html, SOURCE_URL);
    const sp = await mapBluemove(payload, new FakeTaxonomyResolver(), { now: NOW });

    expect(sp.id).toContain(BLUEMOVE_SOURCE);
    expect(sp.nickname).toBe('Beatriz');
    expect(sp.phoneNumber).toBe('678797126');
    expect(sp.contactOptions).toContain('calls');
    expect(sp.contactOptions).toContain('whatsapp');
    expect(sp.contactOptions).toContain('telegram');
    expect(sp.photos).toHaveLength(2);
    expect(sp.baseCity?.id).toBe('city:madrid');
    expect(sp.personalDetails.ageYears).toBe(27);
    expect(sp.badges.verified).toBe(true);
    expect(sp.externalRefs[0]?.source).toBe(BLUEMOVE_SOURCE);
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });
});
