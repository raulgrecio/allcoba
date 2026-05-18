import { describe, expect, it } from 'vitest';
import { extractHotvalencia } from '#infrastructure/adapters/sources/dating/hotvalencia/hotvalencia.extractor.js';
import { mapHotvalencia, HOTVALENCIA_SOURCE } from '#infrastructure/adapters/sources/dating/hotvalencia/hotvalencia.mapper.js';
import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://hotvalencia.com/putas-valencia/valentina-escortvalencia/';
const NOW = new Date('2026-01-01T00:00:00.000Z');

describe('hotvalencia pipeline — HTML → ScrapedProvider', () => {
  it('extract + map produces valid ScrapedProvider', async () => {
    const html = loadHtml('valentina_escortvalencia.html');
    const payload = extractHotvalencia(html, SOURCE_URL);
    const sp = await mapHotvalencia(payload, new FakeTaxonomyResolver(), { now: NOW });

    expect(sp.id).toContain(HOTVALENCIA_SOURCE);
    expect(sp.nickname).toBe('Valentina');
    expect(sp.phoneNumber).toBe('611223344');
    expect(sp.contactOptions).toContain('calls');
    expect(sp.photos).toHaveLength(2);
    expect(sp.externalRefs[0]?.source).toBe(HOTVALENCIA_SOURCE);
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });
});
