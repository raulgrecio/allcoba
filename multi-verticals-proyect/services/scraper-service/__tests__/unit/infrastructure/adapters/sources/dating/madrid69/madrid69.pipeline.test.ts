import { describe, expect, it } from 'vitest';

import { extractMadrid69 } from '#infrastructure/adapters/sources/dating/madrid69/madrid69.extractor.js';
import {
  MADRID69_SOURCE,
  mapMadrid69,
} from '#infrastructure/adapters/sources/dating/madrid69/madrid69.mapper.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadHtml, loadJson } from './helpers/load-fixtures.js';

const SOURCE_URL =
  'https://www.madrid69.com/citas-chicas-madrid-44064-thalia-pura-ternura-644417235';
const NOW = new Date('2026-01-01T00:00:00.000Z');

describe('madrid69 pipeline — HTML + API JSON → ScrapedProvider', () => {
  it('extract + map produces valid ScrapedProvider', async () => {
    const html = loadHtml('kheila_44064.html');
    const apiJson = loadJson('kheila_44064.json');
    const payload = extractMadrid69(html, SOURCE_URL, apiJson);
    const sp = await mapMadrid69(payload, new FakeTaxonomyResolver(), { now: NOW });

    expect(sp.id).toContain(MADRID69_SOURCE);
    expect(sp.nickname).toBe('Kheila');
    expect(sp.phoneNumber).toBe('644417235');
    expect(sp.contactOptions).toContain('calls');
    expect(sp.contactOptions).toContain('whatsapp');
    expect(sp.photos).toHaveLength(2);
    expect(sp.externalRefs[0]?.source).toBe(MADRID69_SOURCE);
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
    expect(sp.confidence).toBeGreaterThan(0.5); // medium (has age from API)
  });
});
